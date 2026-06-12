import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SANDBOX_DIR = path.join(__dirname, '..', 'sandbox');

// Ensure Sandbox directory exists
if (!fs.existsSync(SANDBOX_DIR)) {
  fs.mkdirSync(SANDBOX_DIR, { recursive: true });
}

// Lightweight fallback simulator for common print/math statements when runtime compilers (like JDK/Python/GCC) are missing
const evalExpression = (expr, vars) => {
  // If it's a string literal "..." or '...'
  if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
    return expr.slice(1, -1);
  }
  // If it is a number
  if (!isNaN(expr)) {
    return Number(expr);
  }
  // Substitute variables
  let processedExpr = expr;
  for (const [name, val] of Object.entries(vars)) {
    const regex = new RegExp(`\\b${name}\\b`, 'g');
    processedExpr = processedExpr.replace(regex, typeof val === 'string' ? `"${val}"` : val);
  }
  
  // Safe evaluation for simple math / string concat
  if (/^[a-zA-Z0-9\s+\-*/()"'.]+$/.test(processedExpr)) {
    try {
      const result = new Function(`return (${processedExpr})`)();
      return result;
    } catch (e) {
      return expr;
    }
  }
  return expr;
};

const simulateExecution = (language, code) => {
  const cleanLang = language.toLowerCase();
  let stdout = '';
  let stderr = '';

  try {
    if (cleanLang === 'python' || cleanLang === 'py') {
      const lines = code.split('\n');
      const vars = {};
      
      for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith('#')) continue;

        // Check for print statement
        const printMatch = line.match(/^print\((.*)\)$/);
        if (printMatch) {
          const expr = printMatch[1].trim();
          let val = evalExpression(expr, vars);
          stdout += val + '\n';
        } else {
          const assignMatch = line.match(/^([a-zA-Z_]\w*)\s*=\s*(.*)$/);
          if (assignMatch) {
            const varName = assignMatch[1];
            const expr = assignMatch[2];
            vars[varName] = evalExpression(expr, vars);
          }
        }
      }
      return { stdout, stderr, isTimeout: false, simulated: true };
    } 
    else if (cleanLang === 'java') {
      const lines = code.split('\n');
      const vars = {};

      for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith('//')) continue;

        const printMatch = line.match(/System\.out\.println\((.*)\);?/);
        if (printMatch) {
          const expr = printMatch[1].trim();
          let val = evalExpression(expr, vars);
          stdout += val + '\n';
        }
      }
      return { stdout, stderr, isTimeout: false, simulated: true };
    }
    else if (cleanLang === 'cpp' || cleanLang === 'c++' || cleanLang === 'c') {
      const lines = code.split('\n');
      for (let line of lines) {
        line = line.trim();
        const coutMatch = line.match(/std::cout\s*<<\s*(.*)\s*<<\s*std::endl;?/);
        if (coutMatch) {
          const expr = coutMatch[1].replace(/"/g, '').trim();
          stdout += expr + '\n';
        }
        const printfMatch = line.match(/printf\("(.*)"\);?/);
        if (printfMatch) {
          stdout += printfMatch[1].replace(/\\n/g, '\n').replace(/"/g, '') + '\n';
        }
      }
      return { stdout, stderr, isTimeout: false, simulated: true };
    }
    else if (cleanLang === 'php') {
      const lines = code.split('\n');
      for (let line of lines) {
        line = line.trim();
        const echoMatch = line.match(/echo\s+['"](.*)['"];?/);
        if (echoMatch) {
          stdout += echoMatch[1].replace(/\\n/g, '\n') + '\n';
        }
      }
      return { stdout, stderr, isTimeout: false, simulated: true };
    }
    else if (cleanLang === 'ruby' || cleanLang === 'rb') {
      const lines = code.split('\n');
      for (let line of lines) {
        line = line.trim();
        const putsMatch = line.match(/puts\s+['"](.*)['"]/);
        if (putsMatch) {
          stdout += putsMatch[1] + '\n';
        }
      }
      return { stdout, stderr, isTimeout: false, simulated: true };
    }
  } catch (err) {
    stderr = `Simulation Error: ${err.message}`;
  }
  return null;
};

export const runCode = async (language, code) => {
  const fileId = Math.random().toString(36).substring(7);
  let fileName = '';
  let command = '';
  let compileCommand = '';

  const cleanLang = language.toLowerCase();

  // Create temporary code files based on language selection
  if (cleanLang === 'javascript' || cleanLang === 'js') {
    fileName = `script_${fileId}.js`;
    command = `node ${fileName}`;
  } else if (cleanLang === 'python' || cleanLang === 'py') {
    fileName = `script_${fileId}.py`;
    command = `python ${fileName}`;
  } else if (cleanLang === 'java') {
    const classMatch = code.match(/public\s+class\s+(\w+)/);
    const className = classMatch ? classMatch[1] : `Main_${fileId}`;
    
    let finalCode = code;
    if (!classMatch) {
      finalCode = `
public class ${className} {
    public static void main(String[] args) {
        ${code.includes('public static void main') ? code : `try {
            ${code}
        } catch (Exception e) {
            e.printStackTrace();
        }`}
    }
}`;
    }
    
    fileName = `${className}.java`;
    compileCommand = `javac ${fileName}`;
    command = `java ${className}`;
    code = finalCode; // Replace compile payload
  } else if (cleanLang === 'cpp' || cleanLang === 'c++' || cleanLang === 'c') {
    const ext = cleanLang === 'c' ? 'c' : 'cpp';
    const compiler = cleanLang === 'c' ? 'gcc' : 'g++';
    fileName = `script_${fileId}.${ext}`;
    const exeName = `script_${fileId}.exe`;
    compileCommand = `${compiler} ${fileName} -o ${exeName}`;
    command = `.\\${exeName}`;
  } else if (cleanLang === 'php') {
    fileName = `script_${fileId}.php`;
    command = `php ${fileName}`;
  } else if (cleanLang === 'ruby' || cleanLang === 'rb') {
    fileName = `script_${fileId}.rb`;
    command = `ruby ${fileName}`;
  } else {
    return { error: `Unsupported execution language: ${language}` };
  }

  const filePath = path.join(SANDBOX_DIR, fileName);

  try {
    fs.writeFileSync(filePath, code);

    // If compilation is required
    if (compileCommand) {
      await new Promise((resolve, reject) => {
        exec(compileCommand, { cwd: SANDBOX_DIR, timeout: 5000 }, (error, stdout, stderr) => {
          if (error || stderr) {
            reject(new Error(stderr || stdout || error.message));
          } else {
            resolve();
          }
        });
      });
    }

    // Execute the code
    const result = await new Promise((resolve) => {
      exec(command, { cwd: SANDBOX_DIR, timeout: 5000 }, (error, stdout, stderr) => {
        if (error) {
          // If execution failed because compiler runtime or executable isn't found, try simulation fallback
          const errorMsg = error.message.toLowerCase();
          if (errorMsg.includes('not recognized') || errorMsg.includes('enoent') || errorMsg.includes('cannot find')) {
            const simulated = simulateExecution(cleanLang, code);
            if (simulated && simulated.stdout) {
              return resolve(simulated);
            }
          }

          if (error.killed) {
            resolve({
              stdout: stdout,
              stderr: stderr || 'Execution Error: Process timed out (5-second limit exceeded).',
              isTimeout: true
            });
          } else {
            resolve({
              stdout: stdout,
              stderr: stderr || error.message,
              isTimeout: false
            });
          }
        } else {
          resolve({
            stdout: stdout,
            stderr: stderr || '',
            isTimeout: false
          });
        }
      });
    });

    cleanupFiles(cleanLang, filePath, SANDBOX_DIR, fileName);
    return result;

  } catch (err) {
    cleanupFiles(cleanLang, filePath, SANDBOX_DIR, fileName);
    
    // Check if compilation failed due to missing compiler, attempt simulation fallback
    const errorMsg = err.message.toLowerCase();
    if (errorMsg.includes('not recognized') || errorMsg.includes('enoent') || errorMsg.includes('cannot find')) {
      const simulated = simulateExecution(cleanLang, code);
      if (simulated && simulated.stdout) {
        return simulated;
      }
    }

    let friendlyError = err.message;
    if (friendlyError.includes('not recognized') || friendlyError.includes('ENOENT')) {
      if (cleanLang.includes('python')) {
        friendlyError = "Python compiler/runtime not detected on local path. Please verify Python is installed and added to your environment variables.";
      } else if (cleanLang === 'java') {
        friendlyError = "Java Development Kit (JDK) compiler 'javac' or 'java' not detected on local path. Please verify Java JDK is installed.";
      } else if (cleanLang === 'cpp' || cleanLang === 'c++' || cleanLang === 'c') {
        friendlyError = "C/C++ compiler (gcc/g++) not detected on local path. Please verify a compiler is installed.";
      } else if (cleanLang === 'php') {
        friendlyError = "PHP runtime not detected on local path.";
      } else if (cleanLang === 'ruby' || cleanLang === 'rb') {
        friendlyError = "Ruby runtime not detected on local path.";
      }
    }

    return {
      stdout: '',
      stderr: friendlyError,
      isCompilationError: true
    };
  }
};

function cleanupFiles(lang, filePath, dir, name) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    if (lang === 'java') {
      const classFile = filePath.replace('.java', '.class');
      if (fs.existsSync(classFile)) {
        fs.unlinkSync(classFile);
      }
      const baseName = name.replace('.java', '');
      const files = fs.readdirSync(dir);
      files.forEach(f => {
        if (f.startsWith(baseName) && (f.endsWith('.class') || f.endsWith('.java'))) {
          try { fs.unlinkSync(path.join(dir, f)); } catch(e) {}
        }
      });
    } else if (lang === 'cpp' || lang === 'c++' || lang === 'c') {
      const baseName = name.replace(/\.(cpp|c)$/, '');
      const exeFile = path.join(dir, `${baseName}.exe`);
      if (fs.existsSync(exeFile)) {
        fs.unlinkSync(exeFile);
      }
      // Also clean any general output files in sandbox matching baseName
      const files = fs.readdirSync(dir);
      files.forEach(f => {
        if (f.startsWith(baseName) && (f.endsWith('.exe') || f.endsWith('.obj') || f.endsWith('.o'))) {
          try { fs.unlinkSync(path.join(dir, f)); } catch(e) {}
        }
      });
    }
  } catch (err) {
    console.error('Sandbox cleanup error:', err.message);
  }
}
