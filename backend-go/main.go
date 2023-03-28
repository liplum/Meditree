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
	Name      string
	Path      string
	Type      FileType
	Size      int64
	Name2File map[string]*FileTree
}

func (tree *FileTree) String() string {
	return fmt.Sprintf("%s [%s]", tree.Name, tree.Type)
}

func (tree *FileTree) ToJson() map[string]any {
	res := make(map[string]any)
	for name, file := range tree.Name2File {
		if file.Name2File == nil {
			res[name] = map[string]any{
				"type": file.Type,
				"size": file.Size,
			}
		} else {
			res[name] = file.ToJson()
		}
	}
	return res
}

func CreateFileTree(root string, classifier func(path string) FileType) *FileTree {
	var createSubTree func(tree *FileTree, curDir string)
	createSubTree = func(tree *FileTree, curDir string) {
		// Read the directory contents
		files, err := os.ReadDir(curDir)
		if err != nil {
			return
		}

		// Recursively generate the file tree for each file/directory in the directory
		for _, f := range files {
			fileName := f.Name()
			childPath := filepath.Join(curDir, fileName)

			// If the child is a directory, generate its file tree recursively
			if f.IsDir() {
				subTree := &FileTree{
					Name:      fileName,
					Path:      childPath,
					Name2File: make(map[string]*FileTree),
				}
				tree.Name2File[fileName] = subTree
				createSubTree(subTree, childPath)
			} else {
				// If the child is a file, add it to the file tree
				if fileType := classifier(fileName); fileType != "" {
					if info, err := f.Info(); err == nil {
						tree.Name2File[fileName] = &FileTree{
							Name: fileName,
							Path: childPath,
							Type: fileType,
							Size: info.Size(),
						}
					}
				}
			}
		}
	}
	rootTree := &FileTree{
		Name:      filepath.Base(root),
		Path:      root,
		Name2File: make(map[string]*FileTree),
	}
	createSubTree(rootTree, root)
	return rootTree
}

const configFileName = "meditree.json"

type Config = map[string]any

func loadConfig() (*Config, error) {
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

func enableCors(w *http.ResponseWriter) {
	(*w).Header().Set("Access-Control-Allow-Origin", "*")
}

func buildFileTree(config *Config) *FileTree {
	pattern2type := make(map[string]string)
	for k, v := range (*config)["fileTypePattern"].(map[string]any) {
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
	return CreateFileTree((*config)["root"].(string), fileClassifier)
}

func main() {
	config, err := loadConfig()
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
	tree := buildFileTree(config)
	jsonData, err := json.MarshalIndent(map[string]any{
		"name":  (*config)["name"],
		"files": tree.ToJson(),
	}, "", " ")
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
		return
	}

	http.HandleFunc("/list", func(w http.ResponseWriter, r *http.Request) {
		enableCors(&w)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(jsonData)
	})

	port := int((*config)["port"].(float64))
	fmt.Printf("Server is running on http://localhost:%v\n", port)
	err = http.ListenAndServe(fmt.Sprintf(":%v", port), nil)
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
		return
	}
}
