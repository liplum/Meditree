package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
)

type FileType = string
type FileTree struct {
	Name     string
	Path     string
	Type     FileType
	Size     int64
	Children []*FileTree
}

func (tree *FileTree) ToJson() map[string]any {
	res := make(map[string]any)
	for _, file := range tree.Children {
		if file.Children == nil {
			res[file.Name] = map[string]any{
				"size": file.Size,
				"type": file.Type,
			}
		} else {
			res[file.Name] = file.ToJson()
		}
	}
	return res
}
func CreateFileTree(path string, classifier func(path string) FileType) (*FileTree, error) {
	// Initialize the file tree
	tree := &FileTree{
		Name: filepath.Base(path),
		Path: path,
	}

	// Read the directory contents
	files, err := os.ReadDir(path)
	if err != nil {
		return nil, err
	}

	// Recursively generate the file tree for each file/directory in the directory
	for _, f := range files {
		childPath := filepath.Join(path, f.Name())

		// If the child is a directory, generate its file tree recursively
		if f.IsDir() {
			child, err := CreateFileTree(childPath, classifier)
			if err != nil {
				return nil, err
			}
			tree.Children = append(tree.Children, child)
		} else {
			// If the child is a file, add it to the file tree
			if fileType := classifier(childPath); fileType != "" {
				if info, err := f.Info(); err == nil {
					child := &FileTree{
						Name: f.Name(),
						Path: childPath,
						Type: fileType,
						Size: info.Size(),
					}
					tree.Children = append(tree.Children, child)
				}
			}
		}
	}

	return tree, nil
}

const configFileName = "meditree.json"

func loadConfig() (*map[string]any, error) {
	if bytes, err := os.ReadFile(configFileName); err == nil {
		var config map[string]any
		err := json.Unmarshal(bytes, &config)
		return &config, err
	} else if os.IsNotExist(err) {
		_, _ = os.Create(configFileName)
		return nil, err
	} else {
		return nil, err
	}
}

func main() {
	_config, err := loadConfig()
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
	var config = *_config
	pattern2type := make(map[string]string)
	for k, v := range config["fileTypePattern"].(map[string]any) {
		pattern2type[k] = v.(string)
	}
	fileClassifier := func(path string) FileType {
		for pattern, filetype := range pattern2type {
			if matched, _ := filepath.Match(pattern, path); matched {
				return filetype
			}
		}
		return ""
	}
	tree, err := CreateFileTree(config["root"].(string), fileClassifier)
	jsonData, err := json.MarshalIndent(tree.ToJson(), "", " ")
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
		return
	}

	http.HandleFunc("/list", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(jsonData)
	})

	fmt.Println("Server is running on http://localhost")
	_ = http.ListenAndServe(":80", nil)
}
