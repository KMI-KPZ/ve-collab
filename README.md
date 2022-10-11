# lionet

This is a simple implementation of a social network. It provides all standard functionality such as posting, liking, following, etc.

## Prerequisites:

- Install [MongoDB](https://docs.mongodb.com/manual/installation/) for your OS and enable Authentication
- Install & set up a [DokuWiki](https://www.dokuwiki.org/install#distribution_os_specifics) in order to use the integrated Wiki (optional)

- This project is not supposed to be standalone, but rather used in our [platform application](https://github.com/Smunfr/sse-platform). Therefore you first need to install this platform. Follow the instructions in the repository.

## Installation

- you can install the social network's requirements using pip. simply execute:
  ```sh
  $ pip install -r requirements.txt
  ```
  Thats all you need to do.

## Running the social network

- fire up the platform application (please refer to the guide in the repo)
- copy the ```example_config.json``` into ```config.json``` and fill in the values according to your Keycloak, MongoDB and Dokuwiki settings and setups
- check the host and port you started the platform on. If it is not 8888 on localhost, change the values of ```platform_host```, ```platform_port``` and ```routing_table``` in your ```config.json``` accordingly.
- run
  ```sh
  $ python signing.py
  ```
  once to generate the files ```signing_key.key``` and ```verify_key.key```. Keep the signing key secret AT ALL COST. Take the verify_key and insert ```"lionet": "<verify_key_here>"```, into the ```verify_keys.json``` file over at the platform
- run the following to start the network:
  ```sh
  $ python3 main.py
  ```
  - you have the option to start without the integration of DokuWiki (e.g. if you don't have it installed and/or don't plan to use it). Use the ```--no_wiki``` flag in this case
  - if you desire to store your config file anywhere else than in the main directory, you can use the ```--config path/to/config/file``` flag


## Features
```diff
- Disclaimer: pictures are highly out of date, updates of screenshots required
```

The pictures below show examples for the current visualization state of the features.
### Newsfeed, Streaming and Timelines

The most important feature of this social network is the **Newsfeed** with it's ability to **post**, **review** and **interact** with data.

There are different types of timelines:
  - your **personal timeline**: i.e. your posts, posts of users you follow, posts in spaces you are in
  - another **users timeline** (e.g. for his profile)
  - timeline of a certain **space**
  - timeline of **all posts** (all users and all spaces) for admin purposes

Timelines are getting updated automatically and by scrolling down the page.
#### Post:
- **Text** (required)
- **Tags** (optional)
- **Multiple Audio-, Video- and Documentfiles** (optional)
- **Voice Messages** (optional)
>![Post](Features/Post.png "Post")

#### Review & Interact:
- **like** other people's posts (and see people who liked your posts)
- **comment** posts
- **delete** your posts and comments if you dont want to share them anymore
>![ReviewPost](Features/ReviewPost.png)
---
- **share** posts into your timeline or into workspaces (reposting)
>![SharePost](Features/SharePost.png "SharePost") <br>
---
- **repost** View
>![ReviewSharePost](Features/ReviewSharePost.png "ReviewSharePost")

### Profiles
#### Create your own profile
- **customize** your profile
>![YourProfile](Features/YourProfile.png "YourProfile")
---
>![UpdateYourProfile](Features/UpdateYourProfile.png "UpdateYourProfile")

#### Search and watch other peoples profile
- **search** Users by name
>![SearchUsers](Features/SearchUsers.png "SearchUsers")
- **follow** People u like or just read their latest posts
>![FollowUser](Features/FollowUser.png "FollowUser")

### Workspaces
Create your own Workspaces            |  SocialServ as a Workspace
:-------------------------:|:-------------------------:
![CreateSpaces](Features/CreateSpaces.png "CreateSpaces")  | ![Space](Features/Space.png "Space")