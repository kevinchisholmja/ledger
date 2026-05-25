# GitHub CLI (gh)

Install: `brew install gh` (Mac) or https://cli.github.com  
Authenticate: `gh auth login`

---

## Pull requests

```bash
gh pr create                      # create a PR (interactive)
gh pr create --title "…" --body "…" --base main  # non-interactive
gh pr list                        # list open PRs
gh pr view                        # view current branch's PR
gh pr view 42                     # view PR #42
gh pr checkout 42                 # check out PR #42 locally
gh pr merge                       # merge current branch's PR
gh pr close 42                    # close without merging
gh pr diff                        # show PR diff in terminal
```

---

## Issues

```bash
gh issue list                     # list open issues
gh issue create                   # create an issue (interactive)
gh issue view 42                  # view issue #42
gh issue close 42                 # close issue #42
```

---

## Repos

```bash
gh repo view                      # view current repo in terminal
gh repo view --web                # open in browser
gh repo clone owner/repo          # clone a repo
gh repo create name --public      # create a new repo
gh repo fork owner/repo           # fork a repo
```

---

## Actions / CI

```bash
gh run list                       # list recent workflow runs
gh run view                       # view the latest run
gh run view 1234567               # view a specific run
gh run view --log                 # stream logs of the latest run
gh workflow list                  # list all workflows
gh workflow run deploy.yml        # manually trigger a workflow
```

---

## Pulling logs from GitHub Actions

```bash
gh run list --limit 5             # find the run ID
gh run view <run-id> --log        # full logs for that run
gh run view <run-id> --log-failed # only the failing steps
```

---

## Release

```bash
gh release create v1.0.0                        # create a release (interactive)
gh release create v1.0.0 --title "v1.0.0" --notes "…"
gh release list                                  # list all releases
gh release view v1.0.0                           # view a release
```

---

## Common patterns

**Open current branch's PR in browser:**
```bash
gh pr view --web
```

**Check CI status from terminal:**
```bash
gh run list --branch $(git branch --show-current)
```

**Review someone's PR locally:**
```bash
gh pr checkout 42          # switch to their branch
# test it
gh pr review 42 --approve  # approve
gh pr review 42 --request-changes --body "feedback here"
```
