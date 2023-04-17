import LocalizedStrings from 'react-localization';

export const i18n = new LocalizedStrings({
  en: {
    noFile: "No File",
    search: {
      starFilter: "Only Show Starred",
      placeholder: "Search files or folders"
    },
    playground: {
      starBtn: "Add To Star",
      unstarBtn: "Remove From Star",
      unsupportedFileType: "The file has an unsupported type.",
      nofileSelected: "There is no file selected."
    },
    loading: {
      text: "Loading...",
      failed: "Failed to load content.",
      error: {
        incorrectPasscode: "Incorrect Passcode",
      }
    },
    connect: {
      title: "Connect to server",
      server: "Server",
      passcode: "Passcode",
      passcodePlaceholder: "Optional",
      connectBtn: "Connect",
    },
  },
  zh: {
    noFile: "无文件",
    search: {
      starFilter: "仅显示已收藏",
      placeholder: "搜索文件或文件夹"
    },
    playground: {
      starBtn: "收藏",
      unstarBtn: "取消收藏",
      unsupportedFileType: "文件类型不支持。",
      nofileSelected: "没有文件被选中。",
    },
    loading: {
      text: "加载中……",
      failed: "无法加载目录",
      error: {
        incorrectPasscode: "口令不正确",
      }
    },
    connect: {
      title: "连接服务器",
      server: "服务器",
      passcode: "口令",
      passcodePlaceholder: "可选",
      connectBtn: "连接",
    },
  }
});