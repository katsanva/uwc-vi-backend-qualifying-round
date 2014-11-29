# UWC Initial contest (Wargaming)

## !!! You NEED set application ID in `config.json` file. !!!

To start application:

    vagrant up
    
Or to directly use VirtualBox:

    vagrant up --provider virtualbox

(in case app was not started at provisioning stage):

    vagrant ssh
    nvm use 0.10
    cd /vagrant
    node index.js

By default application can be accessed via [http://localhost:3001/](http://localhost:3001/).

The authorization is as simple as possible.

In case of any questions please email me: this.is.ftm@gmail.com