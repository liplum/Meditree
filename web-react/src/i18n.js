import LocalizedStrings from 'react-localization';

export const i18n = new LocalizedStrings({
  en: {
    search: {
      starFilter: "Only Show Starred",
      placeholder: "Search files or folders"
    },
    playground: {
      starBtn: "Add To Star",
      unstarBtn: "Remove From Star",
    },
    loading: {
      text: "Loading...",
      failed: "Failed to load content.",
    },
    connect: {
      title: "Connect to server",
      server: "Server",
      passcode: "Passcode",
      passcodePlaceholder: "Optional",
    },
  },
  zh: {
    search: {
      starFilter: "仅显示已收藏",
      placeholder: "搜索文件或文件夹"
    },
    playground: {
      starBtn: "收藏",
      unstarBtn: "取消收藏",
    },
    loading: {
      text: "加载中……",
      failed: "无法加载目录",
    },
    connect: {
      title: "连接服务器",
      server: "服务器",
      passcode: "口令",
      passcodePlaceholder: "可选",
    },
  }
});