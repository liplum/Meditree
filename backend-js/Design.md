# Design

## Payload Interface

MyServer:

```json5
{
  "name": "MyServer",
  "root": {
      // path: `/myText.txt`
      "myText.txt": {
        "*type": "text/plain",
      },
      // path: `/myFolder`
      "myFolder": {
        // path: `/myFolder/myVideo.mp4`
        "myVideo.mp4": {
          "*type": "video/mp4",
        }
      }
  }
}
```
