import "./app.css"
import React, { createContext } from "react"
import { goNextFile, goPreviousFile } from "./event"
import { ConfigProvider, theme } from 'antd'
import { FileTreeNavigation } from "./fileTreeNavi";
import { FileDisplayBoard } from "./playground";

import { Layout, Input, Space, Button, Tooltip } from 'antd';
import { StarOutlined, StarFilled } from '@ant-design/icons';
import {
  Outlet,
} from "react-router-dom";

const { Header, Content, Sider } = Layout;
const { Search } = Input;

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

export const FileTreeContext = createContext()

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
  }

  componentDidMount() {
    console.log(`fetching ${backend.listUrl}`)
    this.lastSelectedFile = JSON.parse(
      window.localStorage.getItem("lastSelectedFile")
    )
    this.setState({
      selectedFile: this.lastSelectedFile,
    })
    fetch(backend.listUrl)
      .then((response) => response.json())
      .then((data) => {
        this.setState({
          fileTree: data,
        })
        document.title = data.name
      })
  }

  onSelectFile(file) {
    this.setState({
      selectedFile: file,
    })
    window.localStorage.setItem("lastSelectedFile", JSON.stringify(file))
  }

  render() {
    const astrology = JSON.parse(window.localStorage.getItem("astrology")) ?? {}

    const filterByPrompt = (file) => {
      if (this.state.onlyShowStarred && !astrology[file.path]) {
        return false;
      }
      const searchPrompt = this.state.searchPrompt
      if (!searchPrompt) return true
      return file.path.toLowerCase().includes(searchPrompt.toLocaleLowerCase())
    }

    const selectedFile = this.state.selectedFile
    if (selectedFile) {
      selectedFile.url = backend.reolsveFileUrl(selectedFile.path)
    }
    const title = selectedFile ? selectedFile.name : "No file selected"
    const starred = astrology[selectedFile?.path] === true;
    const appBarAction = (
      <Tooltip title="Add to Star">
        <Button icon={starred ? <StarFilled /> : <StarOutlined />}
          onClick={(newIsStarred) => {
            if (newIsStarred) {
              astrology[selectedFile.path] = true;
            } else {
              delete astrology[selectedFile.path];
            }
            window.localStorage.setItem("astrology", JSON.stringify(astrology));
            this.forceUpdate();
          }}>
        </Button>
      </Tooltip>
    );
    const onlyShowStarred = this.state.onlyShowStarred
    return <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#0A0A0A',
          algorithm: theme.darkAlgorithm,
        },
      }}>
      <Layout style={{
        backgroundColor: "#0A0A0A",
        color: "#FAFAFA",
        fontSize: "14pt",
        height: "100vh",
      }}>
        <Sider
          breakpoint="sm"
          collapsedWidth="0"
          width="300px"
          style={{
            backgroundColor: "#0A0A0A",
            color: "#FAFAFA",
            fontSize: "14pt",
          }}>
          <Space>
            <Tooltip title="Only Show Starred">
              <Button
                type="primary" icon={onlyShowStarred ? <StarFilled /> : <StarOutlined />}
                onClick={() => {
                  this.setState({
                    onlyShowStarred: !onlyShowStarred,
                  })
                }}
              />
            </Tooltip>
            <Search
              placeholder="search files or folders"
              onSearch={(prompt) => this.setState({
                searchPrompt: prompt,
              })}
            />
          </Space>
          <FileTreeNavigation
            onSelectFile={(file) => this.onSelectFile(file)}
            searchDelegate={filterByPrompt}
            lastSelectedFile={this.lastSelectedFile}
            fileTree={this.state.fileTree}
          />
        </Sider>
        <Layout style={{
          backgroundColor: "#0A0A0A",
          color: "#FAFAFA",
        }}>
          <Header style={{
            backgroundColor: "#0A0A0A",
            color: "#FAFAFA",
          }}>
            <Space>
              {appBarAction}
              <label style={{
                fontSize: "18pt",
              }}>
                {selectedFile ?
                  (
                    <Tooltip title={selectedFile.path}>
                      {title}
                    </Tooltip>
                  ) : title}
              </label>
            </Space>
          </Header>
          <Content style={{
            height: "100vh"
          }}>
            <FileDisplayBoard file={selectedFile} />
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  }
}
