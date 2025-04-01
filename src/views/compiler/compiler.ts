interface TokenType {
  type: string
  value: string | null
}
interface NodeType {
  type: 'Text' | 'Element' | 'Root'
  tag?: string
  content?: string
  children: NodeType[]
  jsNode?: Record<string, any>
}
interface TransformContext {
  currentNode: NodeType | null
  parent: NodeType | null
  childIndex: number
  nodeTransforms: ((node: NodeType, context: TransformContext) => void)[]
}
// 定义状态机的状态
const state = {
  initial: 1, // 初始状态 => 要么进入标签开始状态，要么进入文本状态
  tagOpen: 2, // 标签开始 => 进入标签名状态或者tagEnd状态
  tagName: 3, // 标签名 => 要么继续标签名,要么进入标签闭合状态
  tagClose: 4, // 标签闭合 => 进入初始状态
  text: 5, // 文本 => 要么继续文本状态,要么进入标签开始状态
  tagEnd: 6, // 标签结束 "/" => 只能进入tagName状态
};
// 判断是否是English文本，主要是排除标签的可能性
function isText(c: string) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
}
// 模板字符串转换为tokens
export function tokenize(str: string) {
  // 当前状态
  let currentState = state.initial;
  const tokens: TokenType[] = [];
  // 主要用来保存文本内容
  const content = [];
  while (str) {
    const c = str[0];
    switch (currentState) {
      case state.initial:
        // 进入标签开始状态
        if (c === '<') {
          currentState = state.tagOpen;
        }
        // 进入文本状态
        else if (isText(c)) {
          currentState = state.text;
          content.push(c);
        }
        str = str.slice(1);
        break;
      case state.tagOpen:
        // 进入标签名状态
        if (isText(c)) {
          content.push(c);
          currentState = state.tagName;
        }
        else if (c === '/') {
          // 进入标签结束状态
          currentState = state.tagEnd;
        }
        str = str.slice(1);
        break;
      case state.tagName:
        // 继续标签名状态
        if (isText(c)) {
          content.push(c);
        }
        // 进入标签闭合状态
        else if (c === '>') {
          currentState = state.initial;
          if (tokens[tokens.length - 1]?.value === null && tokens[tokens.length - 1].type === 'tagEnd') {
            tokens[tokens.length - 1].value = content.join('');
          }
          else {
            tokens.push({
              type: 'tag',
              value: content.join(''),
            });
          }
          content.length = 0;
        }
        str = str.slice(1);
        break;
      case state.tagClose:
        // 只能进入初始状态
        content.push(c);
        currentState = state.tagEnd;
        str = str.slice(1);
        break;
      case state.text:
        // 继续文本状态
        if (isText(c)) {
          content.push(c);
        }
        else if (c === '<') {
          // 进入标签开始状态
          tokens.push({
            type: 'text',
            value: content.join(''),
          });
          content.length = 0;
          currentState = state.tagOpen;
        }
        str = str.slice(1);
        break;
      case state.tagEnd:
        // 只能进入标签名状态
        tokens.push({
          type: 'tagEnd',
          value: null,
        });
        content.push(c);
        currentState = state.tagName;
        str = str.slice(1);
        break;
    }
  }
  return tokens;
}
// 根据token构建AST
export function ASTBuilder(tokens: TokenType[]) {
  const root: NodeType = {
    type: 'Root',
    children: [],
  };
  const stack: NodeType[] = [root];
  tokens.forEach((token) => {
    if (token.type === 'tag') {
      const node: NodeType = {
        type: 'Element',
        tag: token.value!,
        children: [],
      };
      stack[stack.length - 1].children.push(node);
      stack.push(node);
    }
    else if (token.type === 'text') {
      const text: NodeType = {
        type: 'Text',
        content: token.value!,
        children: [],
      };
      stack[stack.length - 1].children.push(text);
    }
    else if (token.type === 'tagEnd') {
      stack.pop();
    }
  });
  return root;
}
// 辅助函数:用来打印AST结构树
export function dump(node: NodeType, indent = 0) {
  const type = node.type;
  const printValue = type === 'Root' ? 'Root' : type === 'Element' ? `Element:${node.tag}` : `Text:${node.content}`;
  console.log(`${'-'.repeat(indent) + printValue}`);
  node.children.forEach((c) => {
    dump(c, indent + 2);
  });
}

// 遍历节点
function traverseNodes(node: NodeType, context: TransformContext) {
  const exitFn: any = [];
  context.currentNode = node;
  context.nodeTransforms.forEach((trFn) => {
    exitFn.push(trFn(node, context));
  });
  const children = context.currentNode?.children;
  for (let i = 0; i < children?.length; i++) {
    context.parent = context.currentNode;
    context.childIndex = i;
    traverseNodes(children[i], context);
  }
  while (exitFn.length) {
    exitFn.pop()?.();
  }
}

// 模板AST转换为JavaScriptAST函数
// 对于 <div><p>Vue</p><p>Template</p></div>，其转换后的JavaScriptAST为
// function render() {
//  return h('div', [h('p', 'Vue'), h('p', 'Template')])
// }
export function transform(node: NodeType) {
  // 用来转换文本的函数
  const transformText = (node: NodeType) => {
    if (node.type !== 'Text') return;
    node.jsNode = createStringLiteral(node.content!);
  };
  // 用来转换元素的函数
  const transformElement = (node: NodeType) => {
    // 返回一个函数，放入transform时的exitFn中，用于在子元素节点都处理完毕时再处理本节点。
    return () => {
      if (node.type !== 'Element') return;
      const callExp = createCallExpression('h', [createStringLiteral(node.tag!)]);
      if (!node.children.length) return;
      // 判断其子节点的元素个数
      if (node.children.length === 1) {
        callExp.argument.push(node.children[0].jsNode);
      }
      // 数组类型
      else {
        callExp.argument.push(createArrayExpression(node.children.map(n => n.jsNode)));
      }
      node.jsNode = callExp;
    };
  };
  // 上下文
  const context = {
    currentNode: null,
    parent: null,
    childIndex: 0,
    nodeTransforms: [transformText, transformElement],
  };
  traverseNodes(node, context);
  const jsAST = {
    type: 'FunctionDecl',
    id: { type: 'Identifier', name: 'render' },
    params: [],
    body: [
      {
        type: 'ReturnStatement',
        return: node.children[0].jsNode,
      },
    ],
  };
  return jsAST;
}

// 转换为JavaScriptAST的辅助函数
// 创建string节点
function createStringLiteral(value: string) {
  return {
    type: 'StringLiteral',
    value,
  };
}
// 创建数组节点
function createArrayExpression(elements: any[]) {
  return {
    type: 'arrayExpression',
    elements,
  };
}
// 创建Identifier节点
function createIdentifier(name: string) {
  return {
    type: 'identifier',
    name,
  };
}
// 创建CallExpression函数h
function createCallExpression(callee: string, argument: any[]) {
  return {
    type: 'callExpression',
    callee: createIdentifier(callee),
    argument,
  };
}
