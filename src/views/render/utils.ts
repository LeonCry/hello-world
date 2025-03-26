/**
 * 从元素props中获取组件props和attrs
 * @param componentProps 组件props
 * @param props 元素/Node Props
 * @returns realProps, attrs
 */
export function resolveProps(componentProps: Record<string, any>, props: Record<string, any>) {
  const realProps: Record<string, any> = {};
  const attrs: Record<string, any> = {};
  Object.entries(props).forEach(([key, value]) => {
    if (componentProps[key] !== undefined)
      realProps[key] = value;
    else attrs[key] = value;
  });
  return { realProps, attrs };
}
/**
 * 判断新旧props是否有变化
 * @param oldProps 旧Node Props
 * @param newProps 新Node Props
 * @returns Boolean
 */
export function judgePropsChange(oldProps: Record<string, any>, newProps: Record<string, any>) {
  if (Object.keys(oldProps).length !== Object.keys(newProps).length)
    return true;
  return Object.entries(oldProps).some(([key, value]) => newProps[key] !== value);
}
