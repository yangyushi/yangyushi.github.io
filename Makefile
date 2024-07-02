target=/home/yushi/Code/yangyushi.github.io
today=$(shell date +"%m-%d-%y")

serve:
	bundle exec jekyll serve

publish:
	bundle exec jekyll build
	rm -rf $(target)/*
	cp -r _site/* $(target)
	cd $(target); git add *; git commit -m "post update $(today)"; git push

update:
	bundle update
	jekyll build

.PHONY:
	publish update serve
