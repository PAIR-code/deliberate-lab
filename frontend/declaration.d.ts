declare module '*.scss';

declare module '*.css' {
  export const styles: CSSResult;
}

// Webpack define plugin values
declare const GIT_VERSION: string;
declare const GIT_COMMIT_HASH: string;
declare const GIT_BRANCH: string;
declare const GIT_LAST_COMMIT_DATETIME: string;
