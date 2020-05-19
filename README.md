# SocialServ

This is a simple implementation of a social network. It provides all standard functionality such as posting, liking, following, etc.

## Prerequisites:

- Install [MongoDB](https://docs.mongodb.com/manual/installation/) for your OS on default port

- This project is not supposed to be standalone, but rather used in our [platform application](https://github.com/Smunfr/sse-platform). Therefore you first need to install this platform. Follow the instructions in the repository.

## Installation

- you can install the social network's requirements using pip. simply execute:
  ```sh
  $ pip install -r requirements.txt
  ```
  Thats all you need to do.

## Running the social network

- for debugging and developing:
  start dummy_platform.py in a separate terminal:
  ```sh
  $ python3 dummy_platform.py
  ```
  In another terminal window, start the actual social network with the standalone flag:
  ```sh
  $ python3 main.py --standalone_dev
  ```
  In this mode no authentication is required and there are only dummy users for testing.

- for production situation:
  - fire up the platform application (please refer to the guide in the repo)
  - open up the platform in the browser and log in with the admin account       (important, only admin can start modules). This admin account has to be created with the --create_admin flag when starting the platform
  - If you have done everything correctly, you should see a list of available modules. Hit download on SocialServ. If it does not work on the first go, try again after some time, the Github API is mean sometimes.
  - after it is downloaded a "start" button should appear. Click it, and SocialServ will get started. Click on the port number to get redirected.
  - Now all users can see upon logging in to the platform the SocialServ is running and can redirect to it and use it.
  Login to Platform            |  Admin View | User View
  :-------------------------:|:-------------------------:|:-------------------------:
  ![login](Features/platform/login.png "login")  | ![Admin Platform](Features/platform/admin.png) | ![user](Features/platform/user.png)


## Features
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
![CreateSpaces](Features/CreateSpaces.png "CreateSpaces")  | <img src="Features/Space.png" alt="drawing" width="1000"/>
