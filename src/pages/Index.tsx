import ChineseTextEditor from '../components/ChineseTextEditor';

const Index = () => {
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">中文富文本编辑器</h1>
          <p className="text-xl text-muted-foreground">
            支持实时搜索、高亮和替换功能的中文文本编辑器
          </p>
        </div>
        <ChineseTextEditor />
      </div>
    </div>
  );
};

export default Index;
