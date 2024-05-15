module.exports = function loader(source) {
  return `
    import {css} from 'lit';
    export const styles = css\`${source}\`;
  `;
};
