#!/usr/bin/env bash

target="/Users/yushi/OneDrive/Learn/GitHub/yangyushi.github.io"
today=$(date +"%m-%d-%y")

jekyll build
rm -rf "$target"/*
cp -r _site/* "$target"
cd "$target"
git add *
git commit -m "post update $today"
git push
