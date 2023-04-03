package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type FileType = string

type FileTree struct {
	Name      string
	LocalPath string
	Path      string
	Type      FileType
	Size      int64
	Name2File map[string]*FileTree
}

func (tree *FileTree) IsDir() bool {
	return tree.Name2File != nil
}

func (tree *FileTree) IsFile() bool {
	return tree.Name2File == nil
}

func (tree *FileTree) String() string {
	return fmt.Sprintf("%s [%s]", tree.Name, tree.Type)
}

func (tree *FileTree) ResolveFile(pathParts []string) *FileTree {
	cur := tree
	for len(pathParts) > 0 {
		currentPart := pathParts[0]
		pathParts = pathParts[1:]
		file, ok := cur.Name2File[currentPart]
		if !ok {
			return nil
		}
		cur = file
	}
	if cur.IsFile() {
		return cur
	} else {
		return nil
	}
}

func (tree *FileTree) ToJson() map[string]any {
	res := make(map[string]any)
	for name, file := range tree.Name2File {
		if file.IsFile() {
			res[name] = map[string]any{
				"*type": file.Type,
				"size":  file.Size,
				"path":  file.Path,
			}
		} else {
			res[name] = file.ToJson()
		}
	}
	return res
}
func CreateFileTree(root string, classifier func(path string) FileType) *FileTree {
	var createSubTree func(tree *FileTree, parentPath string, curDir string)
	createSubTree = func(tree *FileTree, parentPath string, curDir string) {
		// Read the directory contents
		files, err := os.ReadDir(curDir)
		if err != nil {
			return
		}

		// Recursively generate the file tree for each file/directory in the directory
		for _, f := range files {
			fileName := f.Name()
			childPath := filepath.Join(curDir, fileName)
			var path string
			if len(parentPath) > 0 {
				path = fmt.Sprint(parentPath, "/", fileName)
			} else {
				path = fileName
			}

			// If the child is a directory, generate its file tree recursively
			if f.IsDir() {
				subTree := &FileTree{
					Name:      fileName,
					LocalPath: childPath,
					Name2File: make(map[string]*FileTree),
				}
				createSubTree(subTree, path, childPath)
				if len(subTree.Name2File) != 0 {
					tree.Name2File[fileName] = subTree
				}
			} else {
				// If the child is a file, add it to the file tree
				if fileType := classifier(fileName); fileType != "" {
					if info, err := f.Info(); err == nil {
						tree.Name2File[fileName] = &FileTree{
							Name:      fileName,
							LocalPath: childPath,
							Type:      fileType,
							Path:      path,
							Size:      info.Size(),
						}
					}
				}
			}
		}
	}
	rootTree := &FileTree{
		Name:      filepath.Base(root),
		LocalPath: root,
		Name2File: make(map[string]*FileTree),
	}
	createSubTree(rootTree, "", root)
	return rootTree
}

const configFileName = "meditree.json"

type AppConfig struct {
	Name     string
	Root     string
	Port     int
	FileType map[string]string
}

func loadConfig() (*AppConfig, error) {
	if bytes, err := os.ReadFile(configFileName); err == nil {
		var config map[string]any
		err := json.Unmarshal(bytes, &config)
		if err != nil {
			return nil, err
		}
		name, ok := config["name"].(string)
		if !ok {
			return nil, fmt.Errorf("\"name\" not given")
		}
		root, ok := config["root"].(string)
		if !ok {
			return nil, fmt.Errorf("\"root\" not given")
		}
		port, ok := config["port"].(float64)
		if !ok {
			return nil, fmt.Errorf("\"port\" not given")
		}
		fileTypePatternRaw, ok := config["fileType"].(map[string]any)
		if !ok {
			return nil, fmt.Errorf("\"fileType\" not given")
		}
		fileType := make(map[string]string)
		for k, v := range fileTypePatternRaw {
			fileType[k] = v.(string)
		}
		return &AppConfig{
			Name:     name,
			Root:     root,
			Port:     int(port),
			FileType: fileType,
		}, nil
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

func buildFileTree(config *AppConfig) *FileTree {
	fileClassifier := func(path string) FileType {
		for pattern, filetype := range config.FileType {
			if matched, _ := filepath.Match(pattern, path); matched {
				return filetype
			}
		}
		return ""
	}
	return CreateFileTree(config.Root, fileClassifier)
}

func main() {
	config, err := loadConfig()
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
	tree := buildFileTree(config)
	jsonData, err := json.MarshalIndent(map[string]any{
		"name":  config.Name,
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
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(jsonData)
	})
	http.HandleFunc("/file/", func(w http.ResponseWriter, r *http.Request) {
		enableCors(&w)
		path := r.URL.Path
		path, err := url.PathUnescape(path)
		if err != nil {
			http.Error(w, "Invalid URL path", http.StatusBadRequest)
			return
		}
		path = strings.TrimPrefix(path, "/file/")
		pathParts := strings.Split(path, "/")
		file := tree.ResolveFile(pathParts)
		if file == nil {
			http.NotFound(w, r)
		}
		video, err := os.Open(file.LocalPath)
		if err != nil {
			http.Error(w, "cannot send file", http.StatusBadRequest)
			return
		}
		http.ServeContent(w, r, file.Name, time.Time{}, video)
	})
	fmt.Printf("Server is running on http://localhost:%v\n", config.Port)
	err = http.ListenAndServe(fmt.Sprintf(":%v", config.Port), nil)
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
		return
	}
}
