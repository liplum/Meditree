package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

type FileType = string
type FileTree struct {
	Name     string
	Path     string
	Type     FileType
	Children []*FileTree
}

func (tree *FileTree) ToJson() any {
	res := make(map[string]any)
	for _, file := range tree.Children {
		if file.Children == nil {
			res[file.Name] = "text/plain"
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
			child := &FileTree{
				Name: f.Name(),
				Path: childPath,
			}
			tree.Children = append(tree.Children, child)
		}
	}

	return tree, nil
}

func main() {
	// Set the root directory path
	root := "."

	// Generate the file tree
	tree, err := CreateFileTree(root, func(path string) FileType {
		return ""
	})

	if err != nil {
		fmt.Println("Error generating file tree:", err)
		os.Exit(1)
	}
	jobj := tree.ToJson()
	// Serialize the file tree to JSON
	jsonData, err := json.MarshalIndent(jobj, "", "  ")
	if err != nil {
		fmt.Println("Error serializing file tree to JSON:", err)
		os.Exit(1)
	}

	// Print the file tree
	fmt.Printf("%s\n", jsonData)
}
