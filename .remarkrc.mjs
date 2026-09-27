import remarkValidateLinks from 'remark-validate-links'

export default {
  plugins: [
    [
      remarkValidateLinks,
      {
        // Fully offline and deterministic: `false` disables detecting a hosted Git remote
        // (GitHub/GitLab/Bitbucket) from this repo, so the plugin never builds or resolves
        // full remote URLs — only relative file links and `#heading` anchors are checked.
        repository: false,
      },
    ],
  ],
}
