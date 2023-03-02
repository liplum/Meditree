import React from "react";
import "./App.css";

import { FileTreeNavigation } from "./navigation/Tree.js";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { FileDisplayBoard } from "./playground/FileDisplayBoard";

import { SearchBar } from "./navigation/Search";
import { Tooltip } from "@mui/material";

import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import { isDesktop } from "react-device-detect";

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
        <IconButton
          color="inherit"
          onClick={() => this.props.onStarChange?.(!starred)}>
          {starred ? <StarIcon /> : <StarBorderIcon />}
        </IconButton>
      </Tooltip>
    );
  }

  render() {
    const drawerWidth = isDesktop ? "400px" : "300px";
    const { window } = this.props;
    const container =
      window !== undefined ? () => window().document.body : undefined;
    const selectedFile = this.props.selectedFile;
    const title = selectedFile ? selectedFile.name : "No file selected";
    const onlyShowStarred = this.props.onlyShowStarred;
    const drawer = (
      <div>
        <Toolbar>
          <Tooltip title="Only Show Starred">
            <IconButton
              color="inherit"
              onClick={() => this.props.onOnlyShowStarredChange(!onlyShowStarred)}>
              {onlyShowStarred ? <StarIcon /> : <StarBorderIcon />}
            </IconButton>
          </Tooltip>
          <SearchBar
            onPromptChange={(prompt) => this.props.onSearchPromptChange(prompt)}
          ></SearchBar>
        </Toolbar>
        <Divider />
        <FileTreeNavigation
          onSelectFile={this.props.onSelectFile}
          searchDelegate={this.props.fileFilter}
          lastSelectedFile={this.props.lastSelectedFile}
          fileTree={this.props.fileTree}
        ></FileTreeNavigation>
      </div>
    );

    const handleDrawerToggle = () => {
      this.setState({
        mobileOpen: !this.state.mobileOpen,
      });
    };

    const content = <FileDisplayBoard file={selectedFile} />
    return (
      <Box sx={{ display: "flex" }}>
        <CssBaseline />
        <AppBar
          position="fixed"
          sx={{
            width: { sm: `calc(100% - ${drawerWidth})` },
            ml: { sm: `${drawerWidth}` },
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: "none" } }}
            >
              <MenuIcon />
            </IconButton>
            <Tooltip title={selectedFile ? selectedFile.path : title}>
              <Typography
                variant="h6"
                noWrap
                component="div"
                sx={{ flexGrow: 1 }}
              >
                {title}
              </Typography>
            </Tooltip>
            {this.buildAppBarAction()}
          </Toolbar>
        </AppBar>
        <Box
          component="nav"
          sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        >
          <Drawer // left drawer for small screens
            container={container}
            variant="temporary"
            open={this.state.mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true,
            }}
            sx={{
              display: { xs: "block", sm: "none" },
              "& .MuiDrawer-paper": {
                boxSizing: "border-box",
                width: drawerWidth,
              },
            }}
          >
            {drawer}
          </Drawer>
          <Drawer // left drawer for large screens
            variant="permanent"
            sx={{
              display: { xs: "none", sm: "block" },
              "& .MuiDrawer-paper": {
                boxSizing: "border-box",
                width: drawerWidth,
              },
            }}
            open
          >
            {drawer}
          </Drawer>
        </Box>
        <div>
          <Toolbar />
          <div className="display-board">
            {content}
          </div>
        </div>
      </Box>
    );
  }
}
