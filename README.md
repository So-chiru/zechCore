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

And you need the signaling server to make peers to connect each other. ([zechSignal](https://github.com/So-chiru/zechSignal))

```sh
$ git clone https://github.com/So-chiru/zechSignal
$ cd zechSignal
```

Run signaling server with node command.

```sh
  node .
```

## Contribution

Every kind of contributions are welcome! Please leave some issues or Pull Requests if you found errors.
