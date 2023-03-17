import LocalizedStrings from 'react-localization';

export const i18n = new LocalizedStrings({
  en: {
    search: {
      starFilter: "Only Show Starred",
      placeholder: "search files or folders"
    },
    playground: {
      starBtn: "Add To Star",
      unstarBtn: "Remove From Star",
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
  }
});