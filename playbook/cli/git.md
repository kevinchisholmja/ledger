# Git

---

## Daily workflow

```bash
git status                        # what has changed
git diff                          # what exactly changed (unstaged)
git diff --staged                 # what is staged for commit

git add <file>                    # stage a specific file
git add -p                        # stage changes interactively (chunk by chunk)
git commit -m "message"           # commit
git commit                        # write long, multi-line commit message

git push                          # push to remote
git pull                          # pull from remote
```

---

## Branches

```bash
git branch                        # list local branches
git branch -a                     # list all branches (including remote)

git checkout -b feature/name      # create and switch to a new branch
git checkout main                 # switch to an existing branch
git switch -c feature/name        # modern syntax for checkout -b

git branch -d feature/name        # delete a branch (safe — warns if unmerged)
git push origin --delete name     # delete a remote branch
```

---

## Log

```bash
git log                           # full log
git log --oneline                 # one line per commit
git log --oneline -10             # last 10 commits
git log --oneline main..HEAD      # commits on current branch not yet in main
git log -- <file>                 # history of a specific file
git blame <file>                  # who last changed each line
```

---

## Undoing things

```bash
git restore <file>                # discard unstaged changes to a file
git restore --staged <file>       # unstage a file (keep the changes)
git revert <commit>               # create a new commit that undoes a commit (safe)
git reset --soft HEAD~1           # undo last commit, keep changes staged
git reset HEAD~1                  # undo last commit, keep changes unstaged
```

`git reset --hard` discards changes permanently. Use with care.

---

## Stash

```bash
git stash                         # save uncommitted changes temporarily
git stash pop                     # restore them
git stash list                    # list all stashes
git stash drop                    # delete the most recent stash
```

---

## Merging and rebasing

```bash
git merge feature/name            # merge a branch into current branch
git rebase main                   # rebase current branch onto main
git rebase --abort                # cancel a rebase in progress
git rebase --continue             # continue after resolving a conflict
```

Prefer `merge` for shared branches. Use `rebase` to clean up a local feature branch
before opening a PR.

---

## Remotes

```bash
git remote -v                     # list remotes
git remote add origin <url>       # add a remote
git fetch origin                  # fetch without merging
git pull origin main              # pull a specific branch
git push -u origin feature/name   # push and set upstream tracking
```

---

## Tags

```bash
git tag v1.0.0                    # create a lightweight tag
git tag -a v1.0.0 -m "Release"   # annotated tag
git push origin v1.0.0            # push a tag
git push origin --tags            # push all tags
```

---

## Useful one-liners

```bash
git log --oneline --graph --all   # visual branch tree in terminal
git diff main...HEAD              # all changes since branching from main
git shortlog -sn                  # commit count per author
git show <commit>                 # show a specific commit's diff
```
