'use strict'

const {
  publicKeyAlgorithms,
  rsaKeyAlgorithms,
  hashAlgorithms,
  supportsWorkerThreads,
  createSignature
} = require('./crypto')
const TokenError = require('./error')
const { base64UrlEncode, getAsyncSecret } = require('./utils')

function encodeHeader(alg, kid, additionalHeader, payload, encoding) {
  if (typeof payload !== 'string' && typeof payload !== 'object') {
    throw new TokenError(TokenError.codes.invalidType, 'The payload must be a object, a string or a buffer.')
  } else if (Buffer.isBuffer(payload)) {
    payload = payload.toString(encoding)
  }

  const header = { alg, typ: typeof payload === 'object' ? 'JWT' : undefined, kid, ...additionalHeader }
  return [Buffer.from(JSON.stringify(header)).toString('base64'), header]
}

function encodePayload(payload, encoding, fixedPayload, noTimestamp, expiresIn, notBefore, mutatePayload) {
  // All the claims are added only if the payload is not a string
  if (Buffer.isBuffer(payload)) {
    payload = payload.toString(encoding)
  }

  if (typeof payload === 'string') {
    return base64UrlEncode(Buffer.from(payload).toString('base64'))
  }

  const iat = payload.iat * 1000 || Date.now()
  const additionalPayload = {}

  if (!noTimestamp) {
    additionalPayload.iat = Math.floor(iat / 1000)
  }

  if (expiresIn) {
    additionalPayload.exp = Math.floor((iat + expiresIn) / 1000)
  }

  if (notBefore) {
    additionalPayload.nbf = Math.floor((iat + notBefore) / 1000)
  }

  // Assign the final payload
  let finalPayload

  if (mutatePayload) {
    finalPayload = Object.assign(payload, fixedPayload, additionalPayload)
  } else {
    finalPayload = { ...payload, ...fixedPayload, ...additionalPayload }
  }

  return base64UrlEncode(Buffer.from(JSON.stringify(finalPayload)).toString('base64'))
}

/*
  payload: A object or a serialized JSON as buffer or string. If not a object, none of the additional claim will be added. If "iat" property is present, it will be used instead of using "now".
*/
/*
  secret: It is a string, buffer or object containing the secret for HMAC algorithms or the PEM encoded private key for RSA and ECDSA keys (whose format is defined by the Node's crypto module documentation).
  algorithm: The algorithm to use, default is HS256
  encoding: The token encoding.
  noTimestamp: If not to add the iat claim.
  mutatePayload: If the original payload must be modified in place (and therefore available to the caller function).
  useWorkerThreads: Use worker threads (Node > 10.5.0) for crypto operator, if they are available. This will force the returned function to be async (with callback support) even if the secret is not a callback.
  expiresIn: Time span in milliseconds after which the token expires, added as the "exp" claim in the payload. Note that this will override an existing value in the payload.
  notBefore: Time span in milliseconds before the token is active, added as the "nbf" claim in the payload. Note that this will override an existing value in the payload.
  jti: The token id, added as the "jti" claim in the payload. Note that this will override an existing value in the payload.
  aud: The token audience, added as the "aud" claim in the payload. It must be a string or an array of strings. Note that this will override an existing value in the payload.
  iss: The token audience, added as the "iss" claim in the payload. It must be a string. Note that this will override an existing value in the payload.
  sub: The token audience, added as the "sub" claim in the payload. It must be a string. Note that this will override an existing value in the payload.
  nonce: The token audience, added as the "nonce" claim in the payload. It must be a string. Note that this will override an existing value in the payload.
  kid: The token key id, added as the "kid" claim in the header section.
  header: Additional claims to add to the header section. Note that this can override the "typ" and "kid" claim.
*/
module.exports = function createSigner(options) {
  const {
    secret,
    algorithm,
    encoding,
    noTimestamp,
    mutatePayload,
    useWorkerThreads,
    expiresIn,
    notBefore,
    jti,
    aud,
    iss,
    sub,
    nonce,
    kid,
    header: additionalHeader
  } = { algorithm: 'HS256', ...options }

  // Validate options
  if (
    algorithm !== 'none' &&
    !publicKeyAlgorithms.includes(algorithm) &&
    !rsaKeyAlgorithms.includes(algorithm) &&
    !hashAlgorithms.includes(algorithm)
  ) {
    const supportedAlgorithms = Array.from(
      new Set([...publicKeyAlgorithms, ...rsaKeyAlgorithms, ...hashAlgorithms, 'none'])
    ).join(', ')

    throw new TokenError(
      TokenError.codes.invalidOption,
      `The algorithm option must be one of the following values: ${supportedAlgorithms}.`
    )
  }

  if (!secret || (typeof secret !== 'string' && typeof secret !== 'object' && typeof secret !== 'function')) {
    throw new TokenError(
      TokenError.codes.invalidOption,
      'The secret option must be a string, buffer, object or callback containing a secret or a private key.'
    )
  }

  if (encoding && typeof encoding !== 'string') {
    throw new TokenError(TokenError.codes.invalidOption, 'The encoding option must be a string.')
  }

  if (expiresIn && (typeof expiresIn !== 'number' || expiresIn < 0)) {
    throw new TokenError(TokenError.codes.invalidOption, 'The expiresIn option must be a positive number.')
  }

  if (notBefore && (typeof notBefore !== 'number' || notBefore < 0)) {
    throw new TokenError(TokenError.codes.invalidOption, 'The notBefore option must be a positive number.')
  }

  if (jti && typeof jti !== 'string') {
    throw new TokenError(TokenError.codes.invalidOption, 'The jti option must be a string.')
  }

  if (aud && typeof aud !== 'string' && !Array.isArray(aud)) {
    throw new TokenError(TokenError.codes.invalidOption, 'The aud option must be a string or an array of strings.')
  }

  if (iss && typeof iss !== 'string') {
    throw new TokenError(TokenError.codes.invalidOption, 'The iss option must be a string.')
  }

  if (sub && typeof sub !== 'string') {
    throw new TokenError(TokenError.codes.invalidOption, 'The sub option must be a string.')
  }

  if (nonce && typeof nonce !== 'string') {
    throw new TokenError(TokenError.codes.invalidOption, 'The nonce option must be a string.')
  }

  if (kid && typeof kid !== 'string') {
    throw new TokenError(TokenError.codes.invalidOption, 'The kid option must be a string.')
  }

  if (additionalHeader && typeof additionalHeader !== 'object') {
    throw new TokenError(TokenError.codes.invalidOption, 'The header option must be a object.')
  }

  // Prepare the fixed payload
  const fixedPayload = {
    jti,
    aud,
    iss,
    sub,
    nonce
  }

  // Return the signer
  if (typeof secret !== 'function' && (!useWorkerThreads || !supportsWorkerThreads)) {
    return function signJwt(payload) {
      const [encodedHeader] = encodeHeader(algorithm, kid, additionalHeader, payload, encoding)

      const encodedPayload = encodePayload(
        payload,
        encoding,
        fixedPayload,
        noTimestamp,
        expiresIn,
        notBefore,
        mutatePayload
      )

      const encodedSignature = base64UrlEncode(createSignature(algorithm, secret, encodedHeader, encodedPayload))

      return `${encodedHeader}.${encodedPayload}.${encodedSignature}`
    }
  }

  return async function signJwt(payload, callback) {
    try {
      const [encodedHeader, header] = encodeHeader(algorithm, kid, additionalHeader, payload, encoding)

      // Get the secret - Done after encoding the header since it verifies the payload vlue
      let currentSecret = secret

      if (typeof currentSecret === 'function') {
        try {
          currentSecret = await getAsyncSecret(secret, header)
        } catch (e) {
          throw new TokenError(TokenError.codes.secretFetchingError, 'Cannot fetch secret.', { error: e })
        }
      }

      const encodedPayload = encodePayload(
        payload,
        encoding,
        fixedPayload,
        noTimestamp,
        expiresIn,
        notBefore,
        mutatePayload
      )

      const encodedSignature = base64UrlEncode(
        await createSignature(algorithm, currentSecret, encodedHeader, encodedPayload, useWorkerThreads)
      )

      const rv = `${encodedHeader}.${encodedPayload}.${encodedSignature}`

      if (typeof callback === 'function') {
        callback(null, rv)
      }

      return rv
    } catch (e) {
      if (typeof callback === 'function') {
        return callback(e)
      }

      throw e
    }
  }
}
