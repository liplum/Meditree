module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  env: {
    browser: true,
    es2021: true
  },
  plugins: ["@typescript-eslint"],
  extends: "standard-with-typescript",
  overrides: [
  ],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: ["tsconfig.json"]
  },
  rules: {
    "semi": ["error", "never"],
    "quotes": ["warn", "double"],
    "@typescript-eslint/quotes": ["warn", "double"],
    "space-before-function-paren": "off",
    "@typescript-eslint/space-before-function-paren": "off",
    "prefer-const": "warn",
    "comma-dangle": "off",
    "@typescript-eslint/comma-dangle": "off",
    "no-unused-vars": "warn",
    "@typescript-eslint/no-unused-vars": "warn",
    "space-before-blocks": "warn",
    "@typescript-eslint/space-before-blocks": "warn",
    "keyword-spacing": "warn",
    "@typescript-eslint/keyword-spacing": "warn",
    "@typescript-eslint/type-annotation-spacing": "warn",
    "lines-between-class-members": "warn",
    "@typescript-eslint/lines-between-class-members": "warn",
    "@typescript-eslint/no-floating-promises": "off",
    "@typescript-eslint/strict-boolean-expressions": "off",
    "@typescript-eslint/no-this-alias": "off",
    "no-trailing-spaces": "off",
    "@typescript-eslint/array-type": "off",
    "no-return-await": "off",
    "@typescript-eslint/return-await": "off",
    "no-useless-return": "off",
  }
}
