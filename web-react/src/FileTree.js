export function createDelegate(rootFileTree, rootName = "") {
  const rootChildren = []
  let key = 0
  const rootRenderTree = {
    key: key++,
    title: rootName,
    children: rootChildren
  }
  const key2File = new Map()
  function createNode(parentKeys, children, fileTree) {
    const entries = Object.entries(fileTree)
    reorder(entries)
    for (const [name, file] of entries) {
      if (!(file instanceof Object)) continue
      if (file["*hide"]) continue
      let curKey = key++
      // if file has a type, it presents a file
      if (file["*type"]) {
        key2File.set(curKey, {
          name,
          key: curKey,
          path: file.path,
          type: file["*type"],
          size: file.size,
          tracking: [...parentKeys, curKey],
        })
        children.push({
          key: curKey,
          isLeaf: true,
          title: name,
        })
      } else {
        // otherwise, it presents a directory
        const myChildren = []
        const obj = {
          key: curKey,
          title: name,
          children: myChildren,
        }
        children.push(obj)
        createNode([...parentKeys, curKey], myChildren, file)
      }
    }
  }
  createNode([], rootChildren, rootFileTree)
  return {
    renderTree: rootRenderTree,
    key2File,
    maxKey: key,
  }
}

export function getFirstFile(fileTreeDelegate) {
  for (const [key, file] of fileTreeDelegate.key2File.entries()) {
    return file
  }
  return null
}

/**
 *  @author chatGPT
 *  @returns the render tree
 */
export function filter(renderTree, searchDelegate, getFileById) {
  function filterTree(tree) {
    // base case: leaf node
    if (!tree.children) {
      const file = getFileById(tree.key)
      return searchDelegate(file) ? tree : null
    }

    // filter children recursively
    const filteredChildren = tree.children.map(child => filterTree(child)).filter(child => child !== null)

    // return null if no children match
    if (filteredChildren.length === 0) {
      return null
    }

    // create a new node with the filtered children
    return {
      ...tree,
      children: filteredChildren
    }
  }
  let root = filterTree(renderTree)
  if (!root) {
    root = {
      ...renderTree,
      children: []
    }
  }
  return root
}

/**
 *  @author chatGPT
 */
function reorder(array) {
  array.sort((a, b) => {
    const [fileNameA, fileA] = a;
    const [fileNameB, fileB] = b;
    // if both fileA and fileB are directories
    if (typeof fileA === "object" && typeof fileB === "object") {
      // just compare in string
      return fileNameA.localeCompare(fileNameB)
    }

    const extensionA = fileNameA.split('.').pop();
    const extensionB = fileNameB.split('.').pop();

    // Group files with the same extension together
    if (extensionA !== extensionB) {
      return extensionA.localeCompare(extensionB);
    }

    // Compare files without the extension
    const fileNameOnlyA = fileNameA.replace(/\.[^/.]+$/, '');
    const fileNameOnlyB = fileNameB.replace(/\.[^/.]+$/, '');

    // Check if both file names contain only numbers
    if (/^\d+$/.test(fileNameOnlyA) && /^\d+$/.test(fileNameOnlyB)) {
      return parseInt(fileNameOnlyA) - parseInt(fileNameOnlyB);
    }

    // Check if both file names have a number in them
    const numberA = parseInt(fileNameOnlyA.match(/\d+/));
    const numberB = parseInt(fileNameOnlyB.match(/\d+/));
    if (numberA && numberB && numberA !== numberB) {
      return numberA - numberB;
    }

    // Use lexicographic order as a fallback
    return fileNameA.localeCompare(fileNameB);
  });
}