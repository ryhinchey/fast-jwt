'use strict'

const { readFileSync } = require('fs')
const { resolve } = require('path')

const { compareVerifying, saveLogs } = require('./utils')

const hsToken =
  'eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJhIjoxLCJiIjoyLCJjIjozLCJpYXQiOjE1Nzk1MjEyMTJ9.mIcxteEVjbh2MnKQ3EQlojZojGSyA_guqRBYHQURcfnCSSBTT2OShF8lo9_ogjAv-5oECgmCur_cDWB7x3X53g'
/*
  Regenerate these tokens after regenerating the keys
  by running `npm run generate-tokens` and getting the ES512, RS512 and PS512 tokens
*/
const esToken =
  'eyJhbGciOiJFUzUxMiIsInR5cCI6IkpXVCJ9.eyJhIjoxLCJiIjoyLCJjIjozLCJpYXQiOjE1Nzk1MjEyMzd9.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKTpS291yG8D4qZDAViA7FZrisOAovyytEyK80nYyTtsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKfxaw6zzSnY3W8TzHgp-z6uPHqRfXfuPmEzbFycuoBA'
const rsToken =
  'eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJhIjoxLCJiIjoyLCJjIjozLCJpYXQiOjE1Nzk1MjEyNjF9.X04Dy1GqFCuduViZIqfKzxAXINszEEaywTwh1xU1Q2j03FCHGLe4kM6AmdMeuzPZQgcBxW-R2mGJfpcjDF83iH6fsd0Xs8Boyoml8_AEE9uZTCwpnQEXDHopmAPZ3zijbwgfrJKd0uwzMTi0iJelUhmFz65T_SlW3ZCyK150D7Xwvjq0LaieTFUbAtuJ5rpgHTtiFEtkChAb8lFl3sUYtWKPrmkcmqSQUR660j0jciLBYLG7eymsBiLJz9Knlwg6p5C_Y4hFg-oXKEEIq4G6OFdcfsBGLXhj9rogHRUDBpT_ud7SFYnpvBb3s9pgRM9y8X3eDGqVILSKGrTx4R6tpS1CGvgfUFwtFJk-wgx6JnJUcFFkrRKQ-RQK08AqPDAEZuEOictGsA7uYK5E2IpUSDiYgoZxCYx00NrwTmnvA1f_fz8vVsbfZnGLCwOmQUmFHl3MLZTLk9ti0dW5dWwZU4u-4qTvvytLF4jEKEfvnCv6IjnfYfBo9nAh6zTW5lueT3rehre0lhW6wxfjgflTafeq2C8PV89t1vvy-iIxTz5PoXN-GeyEdChtjbzfT0Tg2pdMAmT6fisGKIYioqSG_0ugn7SskgYrH_SSk8UzkJFd0ksG5DJ3YYwjmrRi3Ll8S46DoxX6v7NOsq9xPiV4wTc8yQnK7zG2P5MdX-uJBK8'
const psToken =
  'eyJhbGciOiJQUzUxMiIsInR5cCI6IkpXVCJ9.eyJhIjoxLCJiIjoyLCJjIjozLCJpYXQiOjE1Nzk1MjEyODV9.nbDiYQXw0h0cxP6wEHNgIOtTAmt64dErGmnTCHG61ALnnr-IvQhxlzQAlQMXLnH8XPvzhjazw5Q1MBcPF1yVCdhIfpo8bfcpUbcwVqpCzfAYsG1FiI4yP0Dh1A8IAyxuPbzGlmFAsUegQ5LyfoF0cbaYcJ0d2_XmXkC7yO7Lb4F13P7ufm-FoKa2_SyW2lqUqadABEIowM3imN4meVF1AxJ6yIKRYZV2PYDrJDTlEpYhd4oKquAX5a70zbU45nW4Rk-Pz5xeW24nH-X1nsTTWL5VJ0uozP2ekP8tb_UYUL4BXvk3vVTn3R3rBBrPLAHRsjPNyp_ulIiceUmRsmx0p-ZfkUncXc5qIX-rTUAmXH72VYWV7do0b77ZXG8s2jRE9oynmC6Sj9y0STNMBX56gJt0Vb9o_Lyuak0aw2JZdhuN0vd5_nDESR19p0rAEcEQKmyEFdITupcnpv8y_kLJeAsOGUyKBS1LQt0QSDgWhI1Zzn7YQw6oWzLfo3vG0HyplAwBxw16D_hA5YYoLrrByvgAKBIcyMRYwowUEnbaUETvSZnpVBM7u2aLKJJUmrQVYCu2w2XZEciAWl3AklwhzqlJ5FKsWTBz1eId6ghZPtbHoBO94qGXWvqvHQDbRtOvI8rn693CSCkfxGvBY481boT79SujPkhHIYFyssNFO_Y'

async function runSuites() {
  await compareVerifying(hsToken, 'HS512', 'secretsecretsecret')
  await compareVerifying(esToken, 'ES512', readFileSync(resolve(__dirname, './keys/es-512-public.key')))
  await compareVerifying(rsToken, 'RS512', readFileSync(resolve(__dirname, './keys/rs-512-public.key')))
  await compareVerifying(psToken, 'PS512', readFileSync(resolve(__dirname, './keys/ps-512-public.key')))

  await saveLogs('verify')
}

runSuites().catch(console.error)
