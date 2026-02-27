const React = require('react')

function NextImage({ src, alt, fill, ...props }) {
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  return React.createElement('img', { src, alt, ...props })
}

module.exports = NextImage
module.exports.default = NextImage
