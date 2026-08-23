.PHONY: serve publish update

serve:
	bundle exec jekyll serve

publish:
	python3 publish.py publish

update:
	bundle update
	python3 publish.py build
