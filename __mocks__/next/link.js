const React = require('react')

function NextLink({ href, children, className, ...props }) {
  return React.createElement('a', { href, className, ...props }, children)
}

module.exports = NextLink
module.exports.default = NextLink
