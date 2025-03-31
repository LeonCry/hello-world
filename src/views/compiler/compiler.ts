interface TokenType {
  type: string
  value: string | null
}
interface NodeType {
  type: string
  tag?: string
  content?: string
  children: NodeType[]
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
