// 生命周期函数
// 创建当前实例
let currentInstance: Record<string, any> | null = null;
export function setCurrentInstance(instance: Record<string, any> | null) {
  currentInstance = instance;
}
// onMounted生命周期函数
export function onMyMounted(fn: () => void) {
  if (!currentInstance) return;
  currentInstance.mounted.push(fn);
}
// 同理其他生命周期函数...因此，setup函数是在beforeCreate之前执行的，因为其所有的生命周期都要在setup函数中执行
