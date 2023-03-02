import "./App.css";
import React from "react";
import { useSwipeable } from "react-swipeable";
import emitter from "./Event";
import { MainBody } from "./Body";

const backend = {
  url: process.env.REACT_APP_BACKEND_URL,
  reolsveFileUrl(path) {
    return encodeURI(`${this.fileUrl}/${path}`);
  },
};
Object.assign(backend, {
  listUrl: `${backend.url}/list`,
  fileUrl: `${backend.url}/file`,
});

export class HomestreamingApp extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      fileTree: undefined,
      selectedFile: null,
      mobileOpen: false,
      searchPrompt: "",
      onlyShowStarred: false,
    };
    this.handleKeyPress = this.handleKeyPress.bind(this);
  }

  componentDidMount() {
    document.addEventListener("keydown", this.handleKeyPress);
    console.log(`fetching ${backend.listUrl}`);
    this.lastSelectedFile = JSON.parse(
      window.localStorage.getItem("lastSelectedFile")
    );
    this.setState({
      selectedFile: this.lastSelectedFile,
    });
    fetch(backend.listUrl)
      .then((response) => response.json())
      .then((data) => {
        this.setState({
          fileTree: data,
        });
      });
  }

  onSelectFile(file) {
    this.setState({
      selectedFile: file,
    });
    window.localStorage.setItem("lastSelectedFile", JSON.stringify(file));
  }

  componentWillUnmount() {
    document.removeEventListener("keydown", this.handleKeyPress);
  }

  handleKeyPress(event) {
    if (event.key === "ArrowLeft") {
      emitter.emit("go-previous", this.state.selectedFile);
    } else if (event.key === "ArrowRight") {
      emitter.emit("go-next", this.state.selectedFile);
    }
  }

  render() {
    const astrology = JSON.parse(window.localStorage.getItem("astrology")) ?? {};

    const filterByPrompt = (file) => {
      if (this.state.onlyShowStarred && !astrology[file.path]) {
        return false;
      }
      const searchPrompt = this.state.searchPrompt;
      if (!searchPrompt) return true;
      return file.path.toLowerCase().includes(searchPrompt.toLocaleLowerCase());
    };

    const selectedFile = this.state.selectedFile;
    if (selectedFile) {
      selectedFile.url = backend.reolsveFileUrl(selectedFile.path);
    }

    return (
        <MainBody
          astrology={astrology}
          fileFilter={filterByPrompt}
          onStarChange={(newIsStarred) => {
            if (newIsStarred) {
              astrology[selectedFile.path] = true;
            } else {
              delete astrology[selectedFile.path];
            }
            window.localStorage.setItem("astrology", JSON.stringify(astrology));
            this.forceUpdate();
          }}
          checkIsStarred={(file) => astrology[file.path] === true}
          onSearchPromptChange={(prompt) => {
            this.setState({
              searchPrompt: prompt,
            });
          }}
          onOnlyShowStarredChange={(newState) => {
            this.setState({
              onlyShowStarred: newState,
            });
          }}
          onlyShowStarred={this.state.onlyShowStarred}
          selectedFile={this.state.selectedFile}
          lastSelectedFile={this.lastSelectedFile}
          fileTree={this.state.fileTree}
          onSelectFile={(file) => this.onSelectFile(file)}
        />
    );
  }
}

function SwipeArea(props) {
  const handlers = useSwipeable({
    onSwipedLeft: (_) => emitter.emit("go-next", props.selectedFile),
    onSwipedRight: (_) => emitter.emit("go-previous", props.selectedFile),
  });
  return (
    <div
      id="swipe-area"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
      }}
      {...handlers}
    >
      {props.children}
    </div>
  );
}

