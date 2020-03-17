# zechCore
zechCore is A peer-to-peer Live Streaming framework using WebRTC.

**WARNING** : This project is still under in heavy development and every function, structure could be changed without any notice. So please, Do not use this on production site yet.

## Introduction

> Your peers make your streaming faster. without additional video server.

As top description says, this framework helps your stream viewers share video chunk directly between peers without extra server. The goals of this framework trying to reach out are

**Easy to setup** : No more video server setup. only one server is enough.

**Fast network** : Neighboring peers are the closest peer from you. High latency, Low speed peer will be excluded by peer network naturally.

**Fail safe** : Long-Long-Long buffering is over. If it fails to find any appropriate peer, It will automatically switch to HTTP fetch.

## Build

We use yarn as package manager.

```sh
$ yarn
```

Use `webpack` command to run.

```sh
$ webpack --watch
```

## Contribution

Every contribution are welcome! Please leave issues or Pull Requests if you found some error.
