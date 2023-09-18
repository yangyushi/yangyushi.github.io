import os
import re
import json
import openai
import hashlib
from glob import glob

TARGET = "assets/search_index.json"

openai.organization = "org-jwqi1P40tS7CWVP6SFDGvQq4"
openai.api_key = os.getenv("OPENAI_API_KEY")
openai.Model.list()

HEAD_PATTERN = re.compile(r"(\w+):\s?(.*)\n")
FILENAME_PATTERN = re.compile(r"(\d+)\-(\d+)\-(\d+)\-(.*)\.md")

PROMPT = """\
Hi Chat, can you summarise the following markdown post in detail,
so that I can build a query service from your summary?

I want your response to be purely descriptive texts without any symbol.
If you meet a block of code, you should try to describe its functionality.

I want your answer to be a single paragraph, which can be very long,
without any linebreak symbols or other unusual symbols.

In addition, I want you to try to understand the provided content,
and to try using a rich vocabulary for your summary.

Finally, I want you to list the 10 most important keywords.

Here is the content.

=====
"""


def get_head(f):
    header = {}
    for line in f:
        if line == "---\n":
            return header
        else:
            query = HEAD_PATTERN.match(line)
            if query:
                header[query.group(1)] = query.group(2)
            else:
                raise ValueError("Invalid markdown header line", line)


paths = list(glob("_posts/*.md"))
paths.sort(key=lambda x: len(open(x).read()))
paths = paths[::-1]

if os.path.isfile(TARGET):
    with open(TARGET) as f:
        result = json.load(f)
    hash_db = [r.get("sha256") for r in result if r.get("sha256")]
else:
    result = []
    hash_db = []

for path in paths:
    with open(path, "rb") as f:
        sha256 = hashlib.sha256(f.read()).hexdigest()
    if sha256 in hash_db:
        continue
    with open(path) as f:
        line = f.readline()
        filename = os.path.basename(path)
        print("Re-indexing", filename)
        query = FILENAME_PATTERN.match(filename)
        if query:
            year, month, day, title = query.groups()
        else:
            raise ValueError("Invalid markdown filename", filename)

        if line == "---\n":
            header = get_head(f)

        post_id = "/".join([
            "", header["category"], year, month, day, f"{title}.html"
        ])

        post_content = f.read()

        post_title = header['title']

        try:
            completion = openai.ChatCompletion.create(
              model="gpt-3.5-turbo-16k",
              messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant"
                },
                {
                    "role": "user",
                    "content": f"{PROMPT}{post_content}\n=====\n",
                 }
              ]
            )
            post_summary = completion.choices[0].message['content']
        except openai.error.InvalidRequestError:
            split = int(len(post_content) // 2)
            post_summary = ""
            for half_content in (
                post_content[:split], post_content[split:]
            ):
                completion = openai.ChatCompletion.create(
                    model="gpt-3.5-turbo-16k",
                    messages=[
                        {
                            "role": "system",
                            "content": "You are a helpful assistant"
                        },
                        {
                            "role": "user",
                            "content": f"{PROMPT}{half_content}\n=====\n",
                         }
                    ]
                )
                post_summary += completion.choices[0].message['content']

        post_summary = post_summary.replace("\n", " ")
        post_summary = post_summary.replace("\\", "")
        post_summary = post_summary.replace('"', "")
        post_summary = post_summary.replace("'", "")
        post_summary = post_summary.replace("&", "")
        post_summary = post_summary.replace("$", "")
        post_summary = post_summary.replace("{", "")
        post_summary = post_summary.replace("}", "")
        post_summary = post_summary.replace("[", "")
        post_summary = post_summary.replace("]", "")

        entry = {
            "id": post_id,
            "title": post_title,
            "content": post_summary,
            "sha256": sha256,
        }

        result.append(entry)

with open("assets/search_index.json", "w") as f:
    json.dump(result, f, indent=2, ensure_ascii=False)
