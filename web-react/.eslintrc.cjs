module.exports = {
  env: {
    browser: true,
    es2021: true
  },
  extends: [
    'plugin:react/recommended',
    'standard'
  ],
  overrides: [
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: [
    'react'
  ],
  rules: {
    "semi": ["error", "never"],
    "quotes": ["warn", "double"],
    "space-before-function-paren": "off",
    "prefer-const": "warn",
    "comma-dangle": "off",
    "no-unused-vars": "warn",
    "space-before-blocks": "warn",
    "keyword-spacing": "warn",
    "lines-between-class-members": "warn",
    "no-trailing-spaces": "off",
    "no-return-await": "off",
    "no-useless-return": "off",
    "yield-star-spacing": "off",
    "react/prop-types": "off",
  }
}
