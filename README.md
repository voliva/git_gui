# Git GUI

(name pending)

This repository contains a [Tauri](https://tauri.app/) project for a visual Git UI.

The main goal is for it to be lightweight and fast, while still being visually appealing. It should make it easier working with git repositories without the need for Git CLI, while also teaching how Git works for new joiners.

## Status

Currently in small development as a side project. At the moment of writing this, it only can git fetch, list commits, render them and create new commits, but it doesn't show the diff of changes yet.

![commit list](https://github.com/voliva/git_gui/blob/main/readme_img/commit_list.png?raw=true)

It ain't much, but it's honest work

## Development

As mentioned, this is a [Tauri](https://tauri.app/) project. The UI is made with SolidJS in the folder `src`. The BE is in Rust and it's in `src-tauri`.

You'll need to have Rust and NodeJS installed.

## License

The complete source code of this program is under the AGPL license.

    Copyright (C) 2023  Víctor Oliva

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.

This program uses other libraries, each one of them with their own license. Check their license description before using them.
