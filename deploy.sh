#!/bin/bash

echo "🚀 Preparing Deployment 🚀"

echo ""
echo -e "\e[34mCommiting any changes made before bumping the version\e[0m"
git add .
git commit -m "Prepare deployment"

echo ""
echo -e "\e[34mBumping the version\e[0m"
npm version patch

echo ""
echo -e "\e[34mPushing the changes to the main branch\e[0m"
git add .
git commit -m "Bump version"
git push origin main

echo ""
echo -e "\e[34mLooking for the release branch\e[0m"
if [ -z "$(git branch --list release)" ]; then
  echo "Creating the release branch locally"
  git checkout -b release
else
    echo "Checking out the release branch"
    git checkout release
    
    echo "Merging the main branch into the release branch"
    git merge main
fi

echo ""
echo -e "\e[34mPushing the release branch to the remote\e[0m"
git push origin release

echo ""
echo -e "\e[34mChecking out the main branch\e[0m"
git checkout main

echo ""
echo -e "\e[32mDeployment completed successfully 🚀🚀🚀\e[0m"
echo "Find the triggered workflow at: https://github.com/VR-web-shop/METEOR/actions"
exit 0
