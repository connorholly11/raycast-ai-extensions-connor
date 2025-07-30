Below is a quick decision tree and the exact commands / checklist for each path.

---

## 1. Pick where you want the extension to live

| Scenario                        | Where it shows up in Raycast                                        | Key setting                                                       |
| ------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Private for your org / team** | “**Private**” tab of the in-app Store (visible only to org members) | `"owner": "<your-org-handle>"` in `package.json`                  |
| **Public on the Raycast Store** | Global Store (anyone can install)                                   | `"owner": "raycast"` (default when you create a public extension) |

---

## 2. Checklist for **either** path

1. **Finish the metadata**

   * 512 × 512 PNG icon that looks good in light & dark mode. ([developers.raycast.com][1])
   * Solid README (screenshots in a `media/` folder).
2. **Validate locally**

   ```bash
   npm run build          # catches missing permissions, invalid manifest, etc.
   ```

([developers.raycast.com][2])
3\. **Add a publish script** (if template predates it):

```jsonc
// package.json
"scripts": {
  "publish": "npx @raycast/api@latest publish"
}
```

4. **Log-in once** (CLI handles device-code auth):

   ```bash
   npx ray login
   ```

---

## 3A. Publish **privately to your team**

```bash
# 1. Be sure the owner field is your org handle
jq '.owner="<your-org-handle>"' -i package.json

# 2. Publish
npm run publish
```

*The CLI will:*

* verify/build → publish to your org’s **Private Extension Store**
* copy a shareable link to your clipboard

Teammates just click the link or open **Store → Private** and hit **⌘ ↵** to install. ([developers.raycast.com][3])

> **Tip:** keep all internal extensions in a single repo and PR review them like normal dev work—Raycast’s docs recommend that for easier collaboration. ([developers.raycast.com][4])

---

## 3B. Publish **to the public Store**

```bash
npm run publish
```

*What happens:*

1. CLI authenticates with GitHub.
2. It forks (or re-uses your fork of) **github.com/raycast/extensions**, adds your code, and opens a pull-request.
3. Raycast reviewers check guidelines; you push fixes by running `npm run publish` again.
4. When the PR is merged, your extension is automatically deployed to the public Store; you’ll get a link to share. ([developers.raycast.com][2])

---

## 4. Updating an extension

Bump your version in `package.json`, commit changes, then run **`npm run publish`** again. The CLI will open (or update) the existing PR for public extensions, or ship straight to your Private Store for org extensions.

---

### FAQ nuggets

* **Do we need a paid Teams plan for private publishing?** Yes—Raycast for Teams unlocks the private store feature. ([raycast.com][5])
* **Can I sideload without publishing?** You can keep running `npm run dev`, but there’s no “install local build” command today; private publishing is the intended friction-free way.
* **Multiple contributors?** Run `npx @raycast/api@latest pull-contributions` if a teammate’s GitHub edits make your next publish complain. ([developers.raycast.com][2])

That’s it—happy shipping!

[1]: https://developers.raycast.com/basics/prepare-an-extension-for-store?utm_source=chatgpt.com "Prepare an Extension for Store - Raycast API"
[2]: https://developers.raycast.com/basics/publish-an-extension "Publish an Extension | Raycast API"
[3]: https://developers.raycast.com/teams/publish-a-private-extension "Publish a Private Extension | Raycast API"
[4]: https://developers.raycast.com/teams/collaborate-on-private-extensions?utm_source=chatgpt.com "Collaborate on Private Extensions - Raycast API"
[5]: https://www.raycast.com/teams?utm_source=chatgpt.com "Raycast for Teams: Streamline Collaboration and Workflow"
