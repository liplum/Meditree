package main

import (
	"os"
	"path/filepath"
)

type FileType = string
type FileTree struct {
	Name     string
	Path     string
	Type     FileType
	Size     int
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
				child := &FileTree{
					Name: f.Name(),
					Path: childPath,
					Type: fileType,
				}
				tree.Children = append(tree.Children, child)
			}
		}
	}

	return tree, nil
}
