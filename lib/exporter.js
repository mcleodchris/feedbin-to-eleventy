const FeedBin = require("./feedbin.js");
const { promises: fs } = require("fs");
const { join } = require("path");
const slugify = require("slugify");

module.exports = async function () {
  try {
    // retrieve feedly feeds
    const feedbin = await FeedBin();

    //cache feeds to a local .json file for troubleshooting
    const cacheDir = join(process.cwd(), "cache");
    await fs.mkdir(cacheDir, { recursive: true });
    await fs.writeFile(
      join(cacheDir, "feeds.json"),
      JSON.stringify(feedbin, null, 4)
    );

    const outputDir = join(process.cwd(), "output");
    // loop through the tags
    for (const { name: category, feeds } of feedbin) {
      // Limit the number of simultaneous writes
      const limit = 20;
      for (let i = 0; i < feeds.length; i += limit) {
        await Promise.all(
          feeds.slice(i, i + limit).map(async (feed) => {
            try {
              const {
                title: name,
                site_url,
                feed_url,
                created_at,
                json_feed,
              } = feed;
              const { icon } = json_feed || {};

              if (!name) throw new Error("Feed name is missing");
              if (!site_url) throw new Error("Site URL is missing");
              if (!feed_url) throw new Error("Feed URL is missing");
              if (!created_at) throw new Error("Creation date is missing");

              const frontmatter = `---
name: "${name}"
category: "${category}"
url: ${site_url}
feed: ${feed_url}
created: ${created_at}
${icon ? `icon: ${icon}` : ""}
---`;

              const filename = join(
                outputDir,
                `${slugify(name, { lower: true, strict: true })}.md`
              );

              await fs.writeFile(filename, frontmatter);
            } catch (err) {
              console.error(`Error processing feed: ${err.message}`);
            }
          })
        );
      }
    }
  } catch (err) {
    console.error(`Error retrieving feeds: ${err.message}`);
  }
};
