# Design

## Payload Interface

Node-A:

```json5
{
  "name": "Node-A",
  "root": {
    "Node-A": {
      // path: `/Node-A/myText.txt`
      "myText.txt": {
        "*type": "text/plain",
      },
      // path: `/Node-A/myFolder`
      "myFolder": {
        // path: `/Node-A/myFolder/myVideo.mp4`
        "myVideo.mp4": {
          "*type": "video/mp4",
        }
      }
    }
  }
}
```

Node-B:

```json5
{
  "name": "Node-B",
  "root": {
    "Node-B": {
      // path: `/Node-B/myAudio.mp3`
      "myAudio.mp3": {
        "*type": "audio/mp3",
      },
      // path: `/Node-B/pic`
      "pic": {
        // path: `/Node-B/pic/1.png`
        "1.png": {
          "*type": "image/png",
        },
        // path: `/Node-B/pic/2.png`
        "2.png": {
          "*type": "image/png",
        },
        // path: `/Node-B/pic/3.png`
        "3.png": {
          "*type": "image/png",
        },
      },
    },
  },
}
```

Node-C:
SubNode: `Node-A`.

```json5
{
  "name":"Node-C",
  "root":{
    "Node-C":{
      // path: `/Node-C/myAudio.mp3`
      "index.html":{
        "*type":"text/html",
      },
      // path: `/Node-C/doc`
      "doc":{
        // path: `/Node-C/doc/node-js.md`
        "node-js.md":{
          "*type": "text/markdown",
        },
      }
    },
    "Node-A": {
      // path: `/Node-A/myText.txt`
      "myText.txt": {
        "*type": "text/plain",
      },
      // path: `/Node-A/myFolder`
      "myFolder": {
        // path: `/Node-A/myFolder/myVideo.mp4`
        "myVideo.mp4": {
          "*type": "video/mp4",
        }
      }
    }
  }
}
```

Node D:
SubNode: `Node-C`, `Node-B`.

```json5
{
  "name":"Node-D",
  "root": {
    "Node-C":{
      "Node-C":{
        // path: `/Node-C/myAudio.mp3`
        "index.html":{
          "*type":"text/html",
        },
        // path: `/Node-C/doc`
        "doc":{
          // path: `/Node-C/doc/node-js.md`
          "node-js.md":{
            "*type": "text/markdown",
          },
        }
      },
      "Node-A": {
        // path: `/Node-A/myText.txt`
        "myText.txt": {
          "*type": "text/plain",
        },
        // path: `/Node-A/myFolder`
        "myFolder": {
          // path: `/Node-A/myFolder/myVideo.mp4`
          "myVideo.mp4": {
            "*type": "video/mp4",
          }
        }
      }
    }
  }
}
```
