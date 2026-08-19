<div align="center">
  <img src="https://raw.githubusercontent.com/OpenListTeam/Logo/main/logo.svg" width="128" height="128" alt="logo" />

  <p><em>OpenList is a resilient, long-term governance, community-driven fork of AList — built to defend open source against trust-based attacks.</em></p>

  <img src="https://goreportcard.com/badge/github.com/OpenListTeam/OpenList/v3" alt="latest version" />
  <a href="https://github.com/OpenListTeam/OpenList/blob/main/LICENSE"><img src="https://img.shields.io/github/license/OpenListTeam/OpenList" alt="License" /></a>
  <a href="https://github.com/OpenListTeam/OpenList/actions?query=workflow%3ABuild"><img src="https://img.shields.io/github/actions/workflow/status/OpenListTeam/OpenList/build.yml?branch=main" alt="Build status" /></a>
  <a href="https://github.com/OpenListTeam/OpenList/releases"><img src="https://img.shields.io/github/release/OpenListTeam/OpenList" alt="latest version" /></a>

  <a href="https://github.com/OpenListTeam/OpenList/discussions"><img src="https://img.shields.io/github/discussions/OpenListTeam/OpenList?color=%23ED8936" alt="discussions" /></a>
  <a href="https://github.com/OpenListTeam/OpenList/releases"><img src="https://img.shields.io/github/downloads/OpenListTeam/OpenList/total?color=%239F7AEA&logo=github" alt="Downloads" /></a>
</div>

---

- English | 中文
- [Contributing](#contributing)
- [CODE OF CONDUCT](#code-of-conduct)
- [LICENSE](./LICENSE)

## Features

- [x] Multiple storages
  - [x] Local storage
  - [x] [Aliyundrive](https://www.alipan.com)
  - [x] OneDrive / Sharepoint ([Global](https://www.microsoft.com/en-us/microsoft-365/onedrive/online-cloud-storage), [CN](https://portal.partner.microsoftonline.cn), DE, US)
  - [x] [189cloud](https://cloud.189.cn) (Personal, Family)
  - [x] [GoogleDrive](https://drive.google.com)
  - [x] [123pan](https://www.123pan.com)
  - [x] [FTP / SFTP](https://en.wikipedia.org/wiki/File_Transfer_Protocol)
  - [x] [PikPak](https://www.mypikpak.com)
  - [x] [S3](https://aws.amazon.com/s3)
  - [x] [Seafile](https://seafile.com)
  - [x] [UPYUN Storage Service](https://www.upyun.com/products/file-storage)
  - [x] [WebDAV](https://en.wikipedia.org/wiki/WebDAV)
  - [x] Teambition([China](https://www.teambition.com), [International](https://us.teambition.com))
  - [x] [MediaFire](https://www.mediafire.com)
  - [x] [Mediatrack](https://www.mediatrack.cn)
  - [x] [ProtonDrive](https://proton.me/drive)
  - [x] [139yun](https://yun.139.com) (Personal, Family, Group, Share)
  - [x] [YandexDisk](https://disk.yandex.com)
  - [x] [BaiduNetdisk](http://pan.baidu.com)
  - [x] [Terabox](https://www.terabox.com/main)
  - [x] [UC](https://drive.uc.cn)
  - [x] [Quark](https://pan.quark.cn)
  - [x] [Thunder](https://pan.xunlei.com)
  - [x] [Lanzou](https://www.lanzou.com)
  - [x] [ILanzou](https://www.ilanzou.com)
  - [x] [Google photo](https://photos.google.com)
  - [x] [Mega.nz](https://mega.nz)
  - [x] [Baidu photo](https://photo.baidu.com)
  - [x] [SMB](https://en.wikipedia.org/wiki/Server_Message_Block)
  - [x] [115](https://115.com)
  - [X] [Cloudreve](https://cloudreve.org)
  - [x] [Dropbox](https://www.dropbox.com)
  - [x] [FeijiPan](https://www.feijipan.com)
  - [x] [dogecloud](https://www.dogecloud.com/product/oss)
  - [x] [Azure Blob Storage](https://azure.microsoft.com/products/storage/blobs)
  - [x] [Chaoxing](https://www.chaoxing.com)
  - [x] [CNB](https://cnb.cool/)
  - [x] [Degoo](https://degoo.com)
  - [x] [Doubao](https://www.doubao.com)
  - [x] [Febbox](https://www.febbox.com)
  - [x] [GitHub](https://github.com)
  - [x] [OpenList](https://github.com/OpenListTeam/OpenList)
  - [x] [Teldrive](https://github.com/tgdrive/teldrive)
  - [x] [Weiyun](https://www.weiyun.com)
  - [x] [DingTalk Docs](https://alidocs.dingtalk.com/)
- [x] Easy to deploy and out-of-the-box
- [x] File preview (PDF, markdown, code, plain text, ...)
- [x] Image preview in gallery mode
- [x] Video and audio preview, support lyrics and subtitles
- [x] Office documents preview (docx, pptx, xlsx, ...)
- [x] `README.md` preview rendering
- [x] File permalink copy and direct file download
- [x] Dark mode
- [x] I18n
- [x] Protected routes (password protection and authentication)
- [x] WebDAV
- [x] Docker Deploy
- [x] Cloudflare Workers proxy
- [x] File/Folder package download
- [x] Web upload(Can allow visitors to upload), delete, mkdir, rename, move and copy
- [x] Offline download
- [x] Copy files between two storage
- [x] Multi-thread downloading acceleration for single-thread download/stream

## Document

- 📘 [Docs](https://doc.oplist.org)
- 🌏 [CN Mirror](https://doc.oplist.org.cn)
- ⚖️ [Terms of Use](https://doc.oplist.org/terms)
- 🔒 [Privacy Policy](https://doc.oplist.org/privacy)

## Demo

- 🌎 [Global Demo](https://demo.oplist.org)
- 🇨🇳 [CN Demo](https://demo.oplist.org.cn)

## Discussion

Please refer to [*Discussions*](https://github.com/OpenListTeam/OpenList/discussions) for raising general questions, ***Issues* is for bug reports and feature requests only.**

## Contributing

### Setup your machine

`OpenList` is written in [Go](https://golang.org/) and [SolidJS](https://www.solidjs.com/).

Prerequisites:

- [git](https://git-scm.com)
- [Go](https://golang.org/doc/install) version declared in [`go.mod`](./go.mod)
- [gcc](https://gcc.gnu.org/)
- [nodejs](https://nodejs.org/)

### Cloning a fork

Fork and clone `OpenList` and `OpenList-Frontend` anywhere:

```shell
git clone https://github.com/<your-username>/OpenList.git
git clone --recurse-submodules https://github.com/<your-username>/OpenList-Frontend.git
```

### Creating a branch

Create a new branch from the `main` branch, with an appropriate name.

```shell
git checkout -b <branch-name>
```

### Preview your change

#### backend

```shell
go run main.go
```

#### frontend

```shell
pnpm dev
```

### Add a new driver

Copy `drivers/template` folder and rename it, and follow the comments in it.

### Community and policies

By contributing, you agree to follow the repository's code of conduct and license terms.

- License: [LICENSE](./LICENSE)

If your contribution includes substantial AI-assisted content, disclose the tools used and the scope of assistance in the pull request.

### Create a commit

Commit messages should be well formatted, and to make that "standardized".

Submit your pull request. For PR titles, follow [Conventional Commits](https://www.conventionalcommits.org).

<https://github.com/OpenListTeam/OpenList/issues/376>

It's suggested to sign your commits. See: [How to sign commits](https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-commits)

### Submit a pull request

Please make sure your code has been formatted with `go fmt` or [prettier](https://prettier.io/) before submitting.

Push your branch to your `openlist` fork and open a pull request against the `main` branch.

### Merge your pull request

Your pull request will be merged after review. Please wait for the maintainer to merge your pull request after review.

At least 1 approving review is required by reviewers with write access. You can also request a review from maintainers.

### Delete your branch

(Optional) After your pull request is merged, you can delete your branch.

### AI Disclosure

If your pull request includes substantial AI-assisted content, disclose it in the PR description.

The pull request description must follow the repository's pull request template.

Fully automated contributions are not considered equivalent to normal community participation.

A contribution may be considered fully automated if it is submitted through an automated agent, or if the submitting account participates in project discussions through an automated agent, without meaningful human review or intervention.

When making this determination, maintainers may consider the overall behavior of the account, including but not limited to disclosed agent usage, interaction patterns, response characteristics, and other available evidence. No single factor is determinative.

Maintainers reserve the right to accept, reject, modify, or reimplement any contribution independently of any action taken against the submitting account. Acceptance of a contribution does not imply acceptance of the submitting account or its contribution method. If an account is determined to be primarily operated through automated processes, we may need to restrict its future participation in contributions until that determination is rescinded.

Please include:

- Tools used, such as ChatGPT, GitHub Copilot, Claude, Cursor, or other AI tools.
- Usage scope, such as code generation, refactoring, documentation, tests, translation, or review assistance.
- Confirmation that you have reviewed and validated all AI-assisted content before submission.
- Confirmation that the submitted content complies with this repository's license and contribution policies.

Minor AI assistance, such as typo fixes, autocomplete, formatting suggestions, or wording polish, does not need to be disclosed.

## Code of Conduct

We as members, contributors, and leaders pledge to make participation in our community a harassment-free experience for everyone, regardless of age, body size, visible or invisible disability, ethnicity, sex characteristics, gender identity and expression, level of experience, education, socio-economic status, nationality, personal appearance, race, religion, or sexual identity and orientation.

We pledge to act and interact in ways that contribute to an open, welcoming, diverse, inclusive, and healthy community.

### Our Standards

Examples of behavior that contributes to a positive environment for our community include:

* Demonstrating empathy and kindness toward other people
* Being respectful of differing opinions, viewpoints, and experiences
* Giving and gracefully accepting constructive feedback
* Accepting responsibility and apologizing to those affected by our mistakes, and learning from the experience
* Focusing on what is best not just for us as individuals, but for the overall community

Examples of unacceptable behavior include:

* The use of sexualized language or imagery, and sexual attention or advances of any kind
* Trolling, insulting or derogatory comments, and personal or political attacks
* Public or private harassment
* Publishing others' private information, such as a physical or email address, without their explicit permission
* Other conduct which could reasonably be considered inappropriate in a professional setting

### Enforcement Responsibilities

Community leaders are responsible for clarifying and enforcing our standards of acceptable behavior and will take appropriate and fair corrective action in response to any behavior that they deem inappropriate, threatening, offensive, or harmful.

Community leaders have the right and responsibility to remove, edit, or reject comments, commits, code, wiki edits, issues, and other contributions that are not aligned to this Code of Conduct, and will communicate reasons for moderation decisions when appropriate.

### Scope

This Code of Conduct applies within all community spaces, and also applies when an individual is officially representing the community in public spaces. Examples of representing our community include using an official e-mail address, posting via an official social media account, or acting as an appointed representative at an online or offline event.

### Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be reported to the community leaders responsible for enforcement at [Insert Contact Method].

All complaints will be reviewed and investigated promptly and fairly.

All community leaders are obligated to respect the privacy and security of the reporter of any incident.

### Enforcement Guidelines

Community leaders will follow these Community Impact Guidelines in determining the consequences for any action they deem in violation of this Code of Conduct:

#### 1. Correction

**Community Impact**: Use of inappropriate language or other behavior deemed unprofessional or unwelcome in the community.

**Consequence**: A private, written warning from community leaders, providing clarity around the nature of the violation and an explanation of why the behavior was inappropriate. A public apology may be requested.

#### 2. Warning

**Community Impact**: A violation through a single incident or series of actions.

**Consequence**: A warning with consequences for continued behavior. No interaction with the people involved, including unsolicited interaction with those enforcing the Code of Conduct, for a specified period of time. This includes avoiding interactions in community spaces as well as external channels like social media. Violating these terms may lead to a temporary or permanent ban.

#### 3. Temporary Ban

**Community Impact**: A serious violation of community standards, including sustained inappropriate behavior.

**Consequence**: A temporary ban from any sort of interaction or public communication with the community for a specified period of time. No public or private interaction with the people involved, including unsolicited interaction with those enforcing the Code of Conduct, is allowed during this period. Violating these terms may lead to a permanent ban.

#### 4. Permanent Ban

**Community Impact**: Demonstrating a pattern of violation of community standards, including sustained inappropriate behavior, harassment of an individual, or aggression toward or disparagement of classes of individuals.

**Consequence**: A permanent ban from any sort of public interaction within the community.

### Attribution

This Code of Conduct is adapted from the [Contributor Covenant][homepage], version 2.0, available at https://www.contributor-covenant.org/version/2/0/code_of_conduct.html.

Community Impact Guidelines were inspired by [Mozilla's code of conduct enforcement ladder](https://github.com/mozilla/diversity).

[homepage]: https://www.contributor-covenant.org

For answers to common questions about this code of conduct, see the FAQ at https://www.contributor-covenant.org/faq. Translations are available at https://www.contributor-covenant.org/translations.

## Security Policy

### Supported Versions

Only the latest stable release receives security patches. We strongly recommend always keeping OpenList up to date.

| Version              | Supported          |
| -------------------- | ------------------ |
| Latest stable (v4.x) | :white_check_mark: |
| Older versions       | :x:                |

### Reporting a Vulnerability

**Please do NOT report security vulnerabilities through public GitHub Issues.**

If you discover a security vulnerability in OpenList, please report it responsibly by using one of the following channels:

- **GitHub Private Security Advisory** (preferred): [Submit here](https://github.com/OpenListTeam/OpenList/security/advisories/new)
- **Telegram**: Contact a maintainer privately via [@OpenListTeam](https://t.me/OpenListTeam)

## Sponsor

[![VPS.Town](https://vps.town/static/images/sponsor.png)](https://vps.town "VPS.Town - Trust, Effortlessly. Your Cloud, Reimagined.")

## Donors

Thanks to the following donors for their generous support:

- [HisAtri](https://github.com/HisAtri)
- 爱发电用户_7jTh
- suka

## License

The `OpenList` is open-source software licensed under the [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.txt) license.

## Disclaimer

- This project is a free and open-source software designed to facilitate file sharing via net disks, primarily intended to support the downloading and learning of the Go programming language.
- Please comply with all applicable laws and regulations when using this software. Any form of misuse is strictly prohibited.
- The software is based on official SDKs or APIs without any modification, disruption, or interference with their behavior.
- It only performs HTTP 302 redirects or traffic forwarding, and does not intercept, store, or tamper with any user data.
- This project is not affiliated with any official platform or service provider.
- The software is provided "as is", without any warranties of any kind, either express or implied, including but not limited to warranties of merchantability or fitness for a particular purpose.
- The maintainers are not liable for any direct or indirect damages arising from the use of, or inability to use, this software.
- You are solely responsible for any risks associated with using this software, including but not limited to account bans or download speed limitations.
- This project is licensed under the [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.txt) License. Please see the [LICENSE](./LICENSE) file for details.

## Contact Us

- [@GitHub](https://github.com/OpenListTeam)
- [Telegram Group](https://t.me/OpenListTeam)
- [Telegram Channel](https://t.me/OpenListOfficial)

## Contributors

We sincerely thank the author [Xhofe](https://github.com/Xhofe) of the original project [AlistGo/alist](https://github.com/AlistGo/alist) and all other contributors.

Thanks goes to these wonderful people:

[![Contributors](https://contrib.rocks/image?repo=OpenListTeam/OpenList)](https://github.com/OpenListTeam/OpenList/graphs/contributors)
