# Links to share

Use the link that matches the place where you post. Each link to Google Play carries a tag, and
Play Console then shows how many people came from each place and how many of them installed the
app. Look under store performance in Play Console, where traffic from "third-party referrals" is
split by UTM source and campaign.

## The web version

No tag is needed here. The web version collects no statistics.

| What | Link |
| --- | --- |
| Landing page | https://filipfogel.github.io/twinkle-twist/ |
| The game, playable at once | https://filipfogel.github.io/twinkle-twist/play/ |
| Today's daily string | https://filipfogel.github.io/twinkle-twist/play/?daily |

Forums for web games usually want the second link, since the game starts without a click in
between.

## The app on Google Play

| Where you post | Link |
| --- | --- |
| Reddit | https://play.google.com/store/apps/details?id=app.twinkletwist&referrer=utm_source%3Dreddit%26utm_campaign%3Dlaunch |
| Hacker News | https://play.google.com/store/apps/details?id=app.twinkletwist&referrer=utm_source%3Dhackernews%26utm_campaign%3Dlaunch |
| LinkedIn | https://play.google.com/store/apps/details?id=app.twinkletwist&referrer=utm_source%3Dlinkedin%26utm_campaign%3Dlaunch |
| Facebook | https://play.google.com/store/apps/details?id=app.twinkletwist&referrer=utm_source%3Dfacebook%26utm_campaign%3Dlaunch |
| TikTok | https://play.google.com/store/apps/details?id=app.twinkletwist&referrer=utm_source%3Dtiktok%26utm_campaign%3Dclips |
| Instagram | https://play.google.com/store/apps/details?id=app.twinkletwist&referrer=utm_source%3Dinstagram%26utm_campaign%3Dclips |
| YouTube | https://play.google.com/store/apps/details?id=app.twinkletwist&referrer=utm_source%3Dyoutube%26utm_campaign%3Dclips |
| itch.io | https://play.google.com/store/apps/details?id=app.twinkletwist&referrer=utm_source%3Ditch%26utm_campaign%3Dpage |
| Friends and family | https://play.google.com/store/apps/details?id=app.twinkletwist&referrer=utm_source%3Dfriends%26utm_campaign%3Dlaunch |

Two more tags are already built in and need nothing from you:

| Where | Tag |
| --- | --- |
| The "Get it on Google Play" button on the landing page | source `website`, campaign `landing` |
| The "Get the Android app" link inside the web version | source `webgame`, campaign `ingame` |

## Making a new link

Start from this address and replace the two words in capitals. Use lower-case letters and no spaces.

    https://play.google.com/store/apps/details?id=app.twinkletwist&referrer=utm_source%3DSOURCE%26utm_campaign%3DCAMPAIGN

`SOURCE` is the place, such as `reddit`. `CAMPAIGN` tells two pushes in the same place apart, such
as `launch` and `christmas`.
