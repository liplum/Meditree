import React from "react";
import "./App.css";
import { FileTreeNavigation } from "./navigation/Tree.js";
import { FileDisplayBoard } from "./playground/FileDisplayBoard";

import { isDesktop } from "react-device-detect";
import { Layout, Input, Space, Menu, theme, Button, Tooltip } from 'antd';
import { StarOutlined, StarFilled } from '@ant-design/icons';

const { Header, Content, Footer, Sider } = Layout;
const { Search } = Input;


export class MainBody extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      mobileOpen: false,
    };
  }

  buildAppBarAction() {
    const selectedFile = this.props.selectedFile;
    if (!selectedFile) return;
    const starred = this.props.checkIsStarred(selectedFile);
    return (
      <Tooltip title="Add to Star">
        <Button icon={starred ? <StarFilled /> : <StarOutlined />}
          onClick={() => this.props.onStarChange?.(!starred)}>
        </Button>
      </Tooltip>
    );
  }

  render() {
    const selectedFile = this.props.selectedFile;
    const title = selectedFile ? selectedFile.name : "No file selected";
    const onlyShowStarred = this.props.onlyShowStarred;
    const fileNav = <FileTreeNavigation
      onSelectFile={this.props.onSelectFile}
      searchDelegate={this.props.fileFilter}
      lastSelectedFile={this.props.lastSelectedFile}
      fileTree={this.props.fileTree}
    />
    const content = <FileDisplayBoard file={selectedFile} />

    return <Layout>
      <Sider>
        <Space.Compact block>
          <Tooltip title="Only Show Starred">
            <Button
              type="primary" icon={<StarOutlined />}
              onClick={() => this.props.onOnlyShowStarredChange(!onlyShowStarred)}
            />
          </Tooltip>
          <Search
            placeholder="input search text"
            onSearch={(prompt) => this.props.onSearchPromptChange(prompt)}
            style={{
              width: 200,
            }}
          />
        </Space.Compact>
        {fileNav}
      </Sider>
      <Layout>
        <Header>{title}</Header>
        <Content>{content}</Content>
        <Footer>footer</Footer>
      </Layout>
    </Layout>
  }
}
