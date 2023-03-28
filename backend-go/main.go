package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

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
	var config = *_config
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
	fmt.Println(config)
	pattern2type := make(map[string]string)
	for k, v := range config["fileTypePattern"].(map[string]string) {
		pattern2type[k] = v
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
	jsonData, err := json.MarshalIndent(tree.ToJson(), "", "  ")
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
		return
	}
	fmt.Println(jsonData)
	//http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
	//	fmt.Fprintf(w, "Hello, you've requested: %s\n", r.URL.Path)
	//})
	//
	//fmt.Println("Server is running on http://localhost")
	//http.ListenAndServe(":80", nil)
}
