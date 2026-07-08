#!/bin/zsh
git remote remove origin 2>/dev/null
git remote add origin https://github.com/joinverakai/verakai-app.git
git push -u origin main
