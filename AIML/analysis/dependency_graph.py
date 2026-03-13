import os
import re

def parse_imports_js(file_content):
    """Regex to extract imported files in JS/TS"""
    imports = []
    
    # ES6 imports: import { Something } from './file'
    es6_pattern = re.compile(r'import\s+.*?\s+from\s+[\'"](.*?)[\'"]')
    imports.extend(es6_pattern.findall(file_content))
    
    # CommonJS requires: require('./file')
    cjs_pattern = re.compile(r'require\s*\(\s*[\'"](.*?)[\'"]\s*\)')
    imports.extend(cjs_pattern.findall(file_content))
    
    # Return only local imports to keep graph focused on architecture
    return [imp for imp in imports if imp.startswith('.')]

def parse_imports_py(file_content):
    """Regex to extract imported modules in Python"""
    imports = []
    
    # from module import xyz
    from_pattern = re.compile(r'^from\s+([a-zA-Z0-9_\.]+)\s+import', re.MULTILINE)
    imports.extend(from_pattern.findall(file_content))
    
    # import module
    import_pattern = re.compile(r'^import\s+([a-zA-Z0-9_\.]+)', re.MULTILINE)
    imports.extend(import_pattern.findall(file_content))
    
    return imports

def generate_mermaid_graph(repo_path):
    """Scans the repo, finds relationships, and generates a Mermaid diagram string."""
    graph_lines = ["graph TD"]
    edges = set()
    
    for root, dirs, files in os.walk(repo_path):
        # skip common ignore dirs
        dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', '.venv', 'dist', 'build', '__pycache__']]
        
        for file in files:
            file_path = os.path.join(root, file)
            # Normalize to forward slashes for cross-platform matching
            rel_path = os.path.relpath(file_path, repo_path).replace('\\', '/')
            node_name = rel_path.split('/')[-1]
            safe_node = re.sub(r'[^a-zA-Z0-9]', '_', node_name)
            
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    
                imports = []
                if file.endswith(('.js', '.jsx', '.ts', '.tsx')):
                    imports = parse_imports_js(content)
                elif file.endswith('.py'):
                    imports = parse_imports_py(content)
                    
                for imp in imports:
                    target_name = imp.split('/')[-1]
                    safe_target = re.sub(r'[^a-zA-Z0-9]', '_', target_name)
                    
                    if safe_node and safe_target and safe_node != safe_target:
                        # Add node labels cleanly
                        edges.add(f"    {safe_node}[\"{node_name}\"] --> {safe_target}[\"{target_name}\"]")
            except Exception as e:
                # Silently ignore unreadable files
                pass
                
    if not edges:
        return "graph TD\n    A[No local dependencies found]"
        
    # Cap edges for very large repos to keep graph readable in frontend
    graph_lines.extend(list(edges)[:80])
    
    return "\n".join(graph_lines)
