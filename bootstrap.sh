#!/usr/bin/env bash

apt-get update
apt-get install memcached

wget -qO- https://raw.githubusercontent.com/creationix/nvm/v0.17.2/install.sh | bash

export NVM_DIR="/root/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"  # This loads nvm

nvm install 0.10.32

cd /vagrant

nohup node index.js 0<&- &>/dev/null &