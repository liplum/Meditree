package main

import (
	"fmt"
	"net/http"
	"os"
)

func loadConfig() {
	os.ReadFile(".")
}

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Hello, you've requested: %s\n", r.URL.Path)
	})

	fmt.Println("Server is running on http://localhost")
	http.ListenAndServe(":80", nil)
}
