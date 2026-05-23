# Overview
This is a CLI app called "kmux"  built with Bun. Bun should be used for package manager and everything.
This app is meant to be used on top of tmux and cannot work without tmux. It only provides better navigation such as:

Instead of `tmux ls`, typing `kmux ls` should give a menu which you can use arrow up and down to select the tmux sesion to attach.

Instead of `tmux a -t session_name`, typing `kmux a` will give a menu of which tmux session to attach.

`kmux k` should give a menu to select which session to kill

This CLI should be released on Brew and NPM.
