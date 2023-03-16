import React from "react";
import { FileTreeNavigation } from "./fileTreeNavi";
import { FileDisplayBoard } from "./playground";

import { Layout, Input, Space, Button, Tooltip } from 'antd';
import { StarOutlined, StarFilled } from '@ant-design/icons';

const { Header, Content, Sider } = Layout;
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
    const selectedFile = this.props.selectedFile
    const title = selectedFile ? selectedFile.name : "No file selected"
    const onlyShowStarred = this.props.onlyShowStarred
    return <Layout style={{
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
              onClick={() => this.props.onOnlyShowStarredChange(!onlyShowStarred)}
            />
          </Tooltip>
          <Search
            placeholder="search files or folders"
            onSearch={(prompt) => this.props.onSearchPromptChange(prompt)}
          />
        </Space>
        <FileTreeNavigation
          onSelectFile={this.props.onSelectFile}
          searchDelegate={this.props.fileFilter}
          lastSelectedFile={this.props.lastSelectedFile}
          fileTree={this.props.fileTree}
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
            {this.buildAppBarAction()}
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
  }
}
